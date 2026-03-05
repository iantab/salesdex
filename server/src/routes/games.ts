import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, like, sql } from "drizzle-orm";
import type { CloudflareBindings, AppVariables } from "../types/bindings";
import {
  games,
  game_details,
  circana_entries,
  circana_reports,
} from "../db/schema";
import { parseIntParam } from "../lib/params";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: AppVariables;
}>();

const listSchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

app.get("/", zValidator("query", listSchema), async (c) => {
  const { search, page, pageSize } = c.req.valid("query");
  const db = c.get("db");

  const where = search ? like(games.title_en, `%${search}%`) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(games)
      .where(where),
    db
      .select({
        id: games.id,
        title_en: games.title_en,
        cover_url: games.cover_url,
      })
      .from(games)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return c.json({
    data: rows,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize,
  });
});

app.get("/:id", async (c) => {
  const id = parseIntParam(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const rows = await db
    .select({
      id: games.id,
      title_en: games.title_en,
      igdb_id: games.igdb_id,
      cover_url: games.cover_url,
      created_at: games.created_at,
      release_date_us: game_details.release_date_us,
      publisher: game_details.publisher,
      developer: game_details.developer,
    })
    .from(games)
    .leftJoin(game_details, eq(game_details.game_id, games.id))
    .where(eq(games.id, id));

  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

app.get("/:id/circana", async (c) => {
  const id = parseIntParam(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const entries = await db
    .select({
      entry_id: circana_entries.id,
      chart_type: circana_entries.chart_type,
      rank: circana_entries.rank,
      last_month_rank: circana_entries.last_month_rank,
      is_new_entry: circana_entries.is_new_entry,
      flags: circana_entries.flags,
      report_id: circana_reports.id,
      year: circana_reports.year,
      month: circana_reports.month,
      period_type: circana_reports.period_type,
      period_start: circana_reports.period_start,
      period_end: circana_reports.period_end,
    })
    .from(circana_entries)
    .innerJoin(
      circana_reports,
      eq(circana_entries.report_id, circana_reports.id),
    )
    .where(eq(circana_entries.game_id, id))
    .orderBy(circana_reports.period_end);

  return c.json({ data: entries });
});

export default app;
