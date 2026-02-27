import type { D1Database } from "@cloudflare/workers-types";
import { createDb } from "../../db/client";
import { circana_entries, circana_reports, games } from "../../db/schema";
import { desc, eq, and } from "drizzle-orm";

interface MomentumEntry {
  game_id: number;
  title_en: string;
  momentum_score: number;
  recent_ranks: number[];
}

/**
 * Weighted sum of rank improvement over last 6 entries.
 * More recent improvements are weighted higher.
 * A lower rank number is better (rank 1 = top).
 * Score = sum of (prev_rank - curr_rank) * weight for each consecutive pair,
 * where weights are [5, 4, 3, 2, 1] from most recent to oldest pair.
 */
export function momentumScore(ranks: number[]): number {
  // ranks ordered most-recent first
  const window = ranks.slice(0, 6);
  if (window.length < 2) return 0;

  const weights = [5, 4, 3, 2, 1];
  let score = 0;
  for (let i = 0; i < window.length - 1; i++) {
    const improvement = window[i + 1] - window[i]; // positive = moved up the chart
    score += improvement * (weights[i] ?? 1);
  }
  return score;
}

export async function getMomentumScores(
  d1: D1Database,
): Promise<MomentumEntry[]> {
  const db = createDb(d1);

  // Get the last 6 reports ordered by period_end desc
  const recentReports = await db
    .select({ id: circana_reports.id })
    .from(circana_reports)
    .orderBy(desc(circana_reports.period_end))
    .limit(6);

  if (recentReports.length === 0) return [];

  const reportIds = recentReports.map((r) => r.id);

  // Fetch all entries for those reports, overall chart
  const entries = await db
    .select({
      game_id: circana_entries.game_id,
      title_en: games.title_en,
      report_id: circana_entries.report_id,
      rank: circana_entries.rank,
    })
    .from(circana_entries)
    .innerJoin(games, eq(circana_entries.game_id, games.id))
    .where(eq(circana_entries.chart_type, "overall"));

  // Filter to only entries in recent reports
  const filtered = entries.filter((e) => reportIds.includes(e.report_id));

  // Group by game_id
  const byGame = new Map<
    number,
    { title_en: string; ranksByReport: Map<number, number> }
  >();
  for (const entry of filtered) {
    if (!byGame.has(entry.game_id)) {
      byGame.set(entry.game_id, {
        title_en: entry.title_en,
        ranksByReport: new Map(),
      });
    }
    byGame.get(entry.game_id)!.ranksByReport.set(entry.report_id, entry.rank);
  }

  // Build momentum results
  const results: MomentumEntry[] = [];
  for (const [game_id, { title_en, ranksByReport }] of byGame) {
    // Ranks ordered most-recent first (reportIds is already ordered newest first)
    const ranks = reportIds
      .filter((rid) => ranksByReport.has(rid))
      .map((rid) => ranksByReport.get(rid)!);
    if (ranks.length < 2) continue;
    results.push({
      game_id,
      title_en,
      momentum_score: momentumScore(ranks),
      recent_ranks: ranks,
    });
  }

  return results.sort((a, b) => b.momentum_score - a.momentum_score);
}
