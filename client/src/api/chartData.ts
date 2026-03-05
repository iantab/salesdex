/**
 * Data normalization helpers for RankHistoryChart.
 * Each function converts raw trend entries into the generic ChartPoint[] + SeriesConfig[]
 * shapes that RankHistoryChart consumes.
 */

import type { ChartPoint, SeriesConfig } from "../components/RankHistoryChart";
import type { TrendEntry, ChartType, FamitsuTrendEntry } from "./types";

// ─── Circana ────────────────────────────────────────────────────────────────

const CIRCANA_SERIES: Record<ChartType, SeriesConfig> = {
  overall: { key: "overall", label: "Overall", color: "#646cff" },
  nintendo: { key: "nintendo", label: "Nintendo", color: "#e4000f" },
  playstation: { key: "playstation", label: "PlayStation", color: "#0070cc" },
  xbox: { key: "xbox", label: "Xbox", color: "#107c10" },
};

export function buildCircanaChartData(data: TrendEntry[]): {
  points: ChartPoint[];
  series: SeriesConfig[];
} {
  const pointMap = new Map<string, ChartPoint>();

  for (const entry of data) {
    const key =
      entry.month != null
        ? `${entry.year}-${String(entry.month).padStart(2, "0")}`
        : `${entry.year}`;
    if (!pointMap.has(key)) {
      const label =
        entry.month != null
          ? new Date(entry.year, entry.month - 1).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          : `${entry.year}`;
      pointMap.set(key, { label, sortKey: key });
    }
    const point = pointMap.get(key)!;
    point[entry.chart_type] = entry.rank;
  }

  // Fill in missing months so gaps are visible on the chart
  const sortedKeys = Array.from(pointMap.keys()).sort();
  if (sortedKeys.length > 1 && sortedKeys[0].includes("-")) {
    const [startYear, startMonth] = sortedKeys[0].split("-").map(Number);
    const [endYear, endMonth] = sortedKeys[sortedKeys.length - 1]
      .split("-")
      .map(Number);
    let year = startYear;
    let month = startMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!pointMap.has(key)) {
        const label = new Date(year, month - 1).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        pointMap.set(key, { label, sortKey: key });
      }
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  const points = Array.from(pointMap.values()).sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey),
  );

  const platformKeys: ChartType[] = [
    "overall",
    "nintendo",
    "playstation",
    "xbox",
  ];
  const series = platformKeys
    .filter((p) => points.some((pt) => pt[p] != null))
    .map((p) => CIRCANA_SERIES[p]);

  return { points, series };
}

// ─── Famitsu ─────────────────────────────────────────────────────────────────

const PLATFORM_PALETTE = [
  "#646cff",
  "#e4000f",
  "#0070cc",
  "#f5a623",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
];

function weekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const weekOfMonth = Math.ceil(d.getDate() / 7);
  const year = String(d.getFullYear()).slice(2);
  return `${month} W${weekOfMonth} '${year}`;
}

export function buildFamitsuChartData(data: FamitsuTrendEntry[]): {
  points: ChartPoint[];
  series: SeriesConfig[];
} {
  const allPlatforms = Array.from(new Set(data.map((e) => e.platform))).sort();

  const pointMap = new Map<string, ChartPoint>();

  for (const entry of data) {
    const key = entry.period_end;
    if (!pointMap.has(key)) {
      pointMap.set(key, { label: weekLabel(key), sortKey: key });
    }
    const point = pointMap.get(key)!;
    point[entry.platform] = entry.rank;
  }

  // Fill in missing weeks so gaps are visible on the chart
  const sortedKeys = Array.from(pointMap.keys()).sort();
  if (sortedKeys.length > 1) {
    const cur = new Date(sortedKeys[0]);
    const endDate = new Date(sortedKeys[sortedKeys.length - 1]);
    while (cur <= endDate) {
      const key = cur.toISOString().slice(0, 10);
      if (!pointMap.has(key)) {
        pointMap.set(key, { label: weekLabel(key), sortKey: key });
      }
      cur.setDate(cur.getDate() + 7);
    }
  }

  const points = Array.from(pointMap.values()).sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey),
  );

  const series: SeriesConfig[] = allPlatforms.map((platform, idx) => ({
    key: platform,
    label: platform,
    color: PLATFORM_PALETTE[idx % PLATFORM_PALETTE.length],
  }));

  return { points, series };
}
