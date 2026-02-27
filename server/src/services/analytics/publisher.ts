import type { D1Database } from "@cloudflare/workers-types";
import { createDb } from "../../db/client";
import {
  circana_entries,
  circana_reports,
  games,
  publishers,
} from "../../db/schema";
import { eq, and } from "drizzle-orm";

interface PublisherMonthSlot {
  publisher_id: number;
  display_name: string;
  year: number;
  month: number | null;
  chart_type: string;
  entry_count: number;
  slot_pct: number;
}

export async function getPublisherShare(
  d1: D1Database,
  year: number,
  chart_type: string,
): Promise<PublisherMonthSlot[]> {
  const db = createDb(d1);

  const rows = await db
    .select({
      publisher_id: publishers.id,
      display_name: publishers.display_name,
      year: circana_reports.year,
      month: circana_reports.month,
      chart_type: circana_entries.chart_type,
      rank: circana_entries.rank,
    })
    .from(circana_entries)
    .innerJoin(games, eq(circana_entries.game_id, games.id))
    .innerJoin(publishers, eq(games.publisher_id, publishers.id))
    .innerJoin(
      circana_reports,
      eq(circana_entries.report_id, circana_reports.id),
    )
    .where(
      and(
        eq(circana_reports.year, year),
        eq(circana_entries.chart_type, chart_type),
      ),
    );

  // Group by publisher + month
  const grouped = new Map<
    string,
    {
      publisher_id: number;
      display_name: string;
      year: number;
      month: number | null;
      chart_type: string;
      count: number;
    }
  >();
  const totals = new Map<string, number>(); // month key -> total entries

  for (const row of rows) {
    const monthKey = `${row.year}-${row.month}`;
    const pubKey = `${monthKey}:${row.publisher_id}`;

    if (!grouped.has(pubKey)) {
      grouped.set(pubKey, {
        publisher_id: row.publisher_id,
        display_name: row.display_name,
        year: row.year,
        month: row.month,
        chart_type: row.chart_type,
        count: 0,
      });
    }
    grouped.get(pubKey)!.count++;

    totals.set(monthKey, (totals.get(monthKey) ?? 0) + 1);
  }

  const result: PublisherMonthSlot[] = [];
  for (const [pubKey, val] of grouped) {
    const monthKey = `${val.year}-${val.month}`;
    const total = totals.get(monthKey) ?? 1;
    result.push({
      ...val,
      entry_count: val.count,
      slot_pct: Math.round((val.count / total) * 1000) / 10,
    });
  }

  return result.sort((a, b) => {
    if (a.month !== b.month) return (a.month ?? 0) - (b.month ?? 0);
    return b.slot_pct - a.slot_pct;
  });
}
