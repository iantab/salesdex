import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { CloudflareBindings } from "../types/bindings";
import { kvCache } from "../middleware/cache";
import { getMomentumScores } from "../services/analytics/momentum";
import { getPublisherShare } from "../services/analytics/publisher";
import { createDb } from "../db/client";
import { circana_entries, circana_reports, games } from "../db/schema";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const TTL_24H = 60 * 60 * 24;

const publisherShareSchema = z.object({
  year: z.coerce.number(),
  chart_type: z.string().default("overall"),
});

app.get(
  "/publisher-share",
  kvCache(TTL_24H),
  zValidator("query", publisherShareSchema),
  async (c) => {
    const { year, chart_type } = c.req.valid("query");
    const data = await getPublisherShare(c.env.DB, year, chart_type);
    return c.json({ data });
  },
);

app.get("/momentum", kvCache(TTL_24H), async (c) => {
  const data = await getMomentumScores(c.env.DB);
  return c.json({ data });
});

app.get("/streaks", kvCache(TTL_24H), async (c) => {
  const db = createDb(c.env.DB);

  // Get all overall entries ordered by game + period
  const rows = await db
    .select({
      game_id: circana_entries.game_id,
      title_en: games.title_en,
      report_id: circana_reports.id,
      period_end: circana_reports.period_end,
    })
    .from(circana_entries)
    .innerJoin(games, eq(circana_entries.game_id, games.id))
    .innerJoin(
      circana_reports,
      eq(circana_entries.report_id, circana_reports.id),
    )
    .where(eq(circana_entries.chart_type, "overall"))
    .orderBy(circana_entries.game_id, circana_reports.period_end);

  // Group by game, find longest consecutive streak
  const gameStreaks = new Map<
    number,
    {
      title_en: string;
      longest_streak: number;
      current_streak: number;
      last_report_id: number | null;
    }
  >();

  // We need all report IDs in order to detect gaps
  const allReports = await db
    .select({ id: circana_reports.id })
    .from(circana_reports)
    .where(eq(circana_reports.period_type, "monthly"))
    .orderBy(circana_reports.period_end);

  const reportOrder = allReports.map((r) => r.id);
  const reportIndex = new Map(reportOrder.map((id, i) => [id, i]));

  for (const row of rows) {
    const idx = reportIndex.get(row.report_id);
    if (idx === undefined) continue;

    if (!gameStreaks.has(row.game_id)) {
      gameStreaks.set(row.game_id, {
        title_en: row.title_en,
        longest_streak: 1,
        current_streak: 1,
        last_report_id: row.report_id,
      });
      continue;
    }

    const gs = gameStreaks.get(row.game_id)!;
    const lastIdx =
      gs.last_report_id !== null
        ? reportIndex.get(gs.last_report_id)
        : undefined;

    if (lastIdx !== undefined && idx === lastIdx + 1) {
      gs.current_streak++;
      if (gs.current_streak > gs.longest_streak)
        gs.longest_streak = gs.current_streak;
    } else {
      gs.current_streak = 1;
    }
    gs.last_report_id = row.report_id;
  }

  const result = [...gameStreaks.entries()].map(([game_id, s]) => ({
    game_id,
    title_en: s.title_en,
    longest_streak: s.longest_streak,
  }));

  return c.json({
    data: result.sort((a, b) => b.longest_streak - a.longest_streak),
  });
});

export default app;
