import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, like, and, sql } from "drizzle-orm";
import type { CloudflareBindings } from "../types/bindings";
import { createDb } from "../db/client";
import {
  games,
  publishers,
  circana_entries,
  circana_reports,
} from "../db/schema";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const listSchema = z.object({
  search: z.string().optional(),
  publisher_id: z.coerce.number().optional(),
  franchise: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
});

app.get("/", zValidator("query", listSchema), async (c) => {
  const { search, publisher_id, franchise, page, pageSize } =
    c.req.valid("query");
  const db = createDb(c.env.DB);

  const conditions = [];
  if (search) conditions.push(like(games.title_en, `%${search}%`));
  if (publisher_id) conditions.push(eq(games.publisher_id, publisher_id));
  if (franchise) conditions.push(eq(games.franchise, franchise));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(games)
      .where(where),
    db
      .select({
        id: games.id,
        title_en: games.title_en,
        title_jp: games.title_jp,
        developer: games.developer,
        franchise: games.franchise,
        release_date_us: games.release_date_us,
        cover_url: games.cover_url,
        publisher_id: games.publisher_id,
        publisher_name: publishers.display_name,
      })
      .from(games)
      .leftJoin(publishers, eq(games.publisher_id, publishers.id))
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
  const id = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  const rows = await db
    .select({
      id: games.id,
      title_en: games.title_en,
      title_jp: games.title_jp,
      developer: games.developer,
      franchise: games.franchise,
      igdb_id: games.igdb_id,
      release_date_us: games.release_date_us,
      release_date_jp: games.release_date_jp,
      cover_url: games.cover_url,
      created_at: games.created_at,
      publisher_id: publishers.id,
      publisher_name: publishers.display_name,
      publisher_country: publishers.country,
    })
    .from(games)
    .leftJoin(publishers, eq(games.publisher_id, publishers.id))
    .where(eq(games.id, id));

  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

app.get("/:id/circana", async (c) => {
  const id = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

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
