import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import type { CloudflareBindings } from "../types/bindings";
import { createDb } from "../db/client";
import {
  circana_reports,
  circana_market_totals,
  circana_entries,
  games,
} from "../db/schema";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const reportsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2035).optional(),
  period_type: z.enum(["monthly", "annual"]).optional(),
});

app.get("/reports", zValidator("query", reportsQuerySchema), async (c) => {
  const { year, period_type } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const conditions = [];
  if (year) conditions.push(eq(circana_reports.year, year));
  if (period_type)
    conditions.push(eq(circana_reports.period_type, period_type));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(circana_reports).where(where);
  return c.json({ data: rows });
});

app.get("/reports/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  const [report, totals] = await Promise.all([
    db.select().from(circana_reports).where(eq(circana_reports.id, id)),
    db
      .select()
      .from(circana_market_totals)
      .where(eq(circana_market_totals.report_id, id)),
  ]);

  if (report.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({
    data: { report: report[0], market_totals: totals[0] ?? null },
  });
});

const chartsQuerySchema = z.object({
  report_id: z.coerce.number(),
  chart_type: z.string(),
});

app.get("/charts", zValidator("query", chartsQuerySchema), async (c) => {
  const { report_id, chart_type } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const rows = await db
    .select({
      id: circana_entries.id,
      rank: circana_entries.rank,
      last_month_rank: circana_entries.last_month_rank,
      is_new_entry: circana_entries.is_new_entry,
      flags: circana_entries.flags,
      game_id: games.id,
      title_en: games.title_en,
      cover_url: games.cover_url,
    })
    .from(circana_entries)
    .innerJoin(games, eq(circana_entries.game_id, games.id))
    .where(
      and(
        eq(circana_entries.report_id, report_id),
        eq(circana_entries.chart_type, chart_type),
      ),
    )
    .orderBy(circana_entries.rank);

  return c.json({ data: rows });
});

const trendsQuerySchema = z.object({
  game_id: z.coerce.number(),
  from: z.string().optional(),
  to: z.string().optional(),
});

app.get("/trends", zValidator("query", trendsQuerySchema), async (c) => {
  const { game_id, from, to } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const conditions = [eq(circana_entries.game_id, game_id)];
  if (from) conditions.push(gte(circana_reports.period_end, from));
  if (to) conditions.push(lte(circana_reports.period_end, to));

  const rows = await db
    .select({
      report_id: circana_reports.id,
      year: circana_reports.year,
      month: circana_reports.month,
      period_end: circana_reports.period_end,
      chart_type: circana_entries.chart_type,
      rank: circana_entries.rank,
      last_month_rank: circana_entries.last_month_rank,
    })
    .from(circana_entries)
    .innerJoin(
      circana_reports,
      eq(circana_entries.report_id, circana_reports.id),
    )
    .where(and(...conditions))
    .orderBy(circana_reports.period_end);

  return c.json({ data: rows });
});

export default app;
