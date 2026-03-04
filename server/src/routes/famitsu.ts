import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import type { CloudflareBindings, AppVariables } from "../types/bindings";
import {
  famitsu_reports,
  famitsu_software_entries,
  famitsu_hardware_entries,
  games,
} from "../db/schema";
import { kvCache } from "../middleware/cache";
import { parseIntParam } from "../lib/params";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: AppVariables;
}>();

const reportsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2035).optional(),
});

app.get(
  "/reports",
  kvCache(300),
  zValidator("query", reportsQuerySchema),
  async (c) => {
    const { year } = c.req.valid("query");
    const db = c.get("db");

    const conditions = [];
    if (year) conditions.push(eq(famitsu_reports.year, year));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(famitsu_reports)
      .where(where)
      .orderBy(famitsu_reports.period_start);
    return c.json({ data: rows });
  },
);

app.get("/reports/:id", kvCache(300), async (c) => {
  const id = parseIntParam(c.req.param("id"));
  if (id === null) return c.json({ error: "Not found" }, 404);
  const db = c.get("db");

  const rows = await db
    .select()
    .from(famitsu_reports)
    .where(eq(famitsu_reports.id, id));

  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

const softwareQuerySchema = z.object({
  report_id: z.coerce.number().int().positive(),
  platform: z.string().optional(),
});

app.get(
  "/software",
  kvCache(300),
  zValidator("query", softwareQuerySchema),
  async (c) => {
    const { report_id, platform } = c.req.valid("query");
    const db = c.get("db");

    const conditions = [eq(famitsu_software_entries.report_id, report_id)];
    if (platform)
      conditions.push(eq(famitsu_software_entries.platform, platform));

    const rows = await db
      .select({
        id: famitsu_software_entries.id,
        rank: famitsu_software_entries.rank,
        platform: famitsu_software_entries.platform,
        weekly_sales: famitsu_software_entries.weekly_sales,
        lifetime_sales: famitsu_software_entries.lifetime_sales,
        is_new: famitsu_software_entries.is_new,
        release_date: famitsu_software_entries.release_date,
        game_id: games.id,
        title_en: games.title_en,
        cover_url: games.cover_url,
      })
      .from(famitsu_software_entries)
      .innerJoin(games, eq(famitsu_software_entries.game_id, games.id))
      .where(and(...conditions))
      .orderBy(famitsu_software_entries.rank);

    return c.json({ data: rows });
  },
);

const hardwareQuerySchema = z.object({
  report_id: z.coerce.number().int().positive(),
});

app.get(
  "/hardware",
  kvCache(300),
  zValidator("query", hardwareQuerySchema),
  async (c) => {
    const { report_id } = c.req.valid("query");
    const db = c.get("db");

    const rows = await db
      .select()
      .from(famitsu_hardware_entries)
      .where(eq(famitsu_hardware_entries.report_id, report_id))
      .orderBy(famitsu_hardware_entries.rank);

    return c.json({ data: rows });
  },
);

const trendsQuerySchema = z.object({
  game_id: z.coerce.number().int().positive(),
  platform: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

app.get("/trends", zValidator("query", trendsQuerySchema), async (c) => {
  const { game_id, platform, from, to } = c.req.valid("query");
  const db = c.get("db");

  const conditions = [eq(famitsu_software_entries.game_id, game_id)];
  if (platform)
    conditions.push(eq(famitsu_software_entries.platform, platform));
  if (from) conditions.push(gte(famitsu_reports.period_end, from));
  if (to) conditions.push(lte(famitsu_reports.period_end, to));

  const rows = await db
    .select({
      report_id: famitsu_reports.id,
      year: famitsu_reports.year,
      week_of_year: famitsu_reports.week_of_year,
      period_start: famitsu_reports.period_start,
      period_end: famitsu_reports.period_end,
      rank: famitsu_software_entries.rank,
      platform: famitsu_software_entries.platform,
      weekly_sales: famitsu_software_entries.weekly_sales,
      lifetime_sales: famitsu_software_entries.lifetime_sales,
    })
    .from(famitsu_software_entries)
    .innerJoin(
      famitsu_reports,
      eq(famitsu_software_entries.report_id, famitsu_reports.id),
    )
    .where(and(...conditions))
    .orderBy(famitsu_reports.period_start);

  return c.json({ data: rows });
});

export default app;
