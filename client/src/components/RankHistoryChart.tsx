import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TrendEntry, ChartType } from "../api/types";

const PLATFORM_COLORS: Record<ChartType, string> = {
  overall: "#646cff",
  nintendo: "#e4000f",
  playstation: "#0070cc",
  xbox: "#107c10",
};

const PLATFORM_LABELS: Record<ChartType, string> = {
  overall: "Overall",
  nintendo: "Nintendo",
  playstation: "PlayStation",
  xbox: "Xbox",
};

interface ChartPoint {
  label: string;
  period_end: string;
  overall?: number;
  nintendo?: number;
  playstation?: number;
  xbox?: number;
}

interface Props {
  data: TrendEntry[];
}

export function RankHistoryChart({ data }: Props) {
  // Pivot flat rows into one object per period_end
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
      pointMap.set(key, { label, period_end: key });
    }
    const point = pointMap.get(key)!;
    point[entry.chart_type] = entry.rank;
  }

  const chartData = Array.from(pointMap.values()).sort((a, b) =>
    a.period_end.localeCompare(b.period_end),
  );

  // Determine which platforms have any data
  const platforms = (
    ["overall", "nintendo", "playstation", "xbox"] as ChartType[]
  ).filter((p) => chartData.some((pt) => pt[p] != null));

  const [visible, setVisible] = React.useState<Set<ChartType>>(
    new Set(platforms),
  );

  function togglePlatform(platform: ChartType) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  }

  return (
    <div>
      {platforms.length > 1 && (
        <div className="modal__chart-toggles">
          {platforms.map((p) => {
            const active = visible.has(p);
            return (
              <button
                key={p}
                className={`modal__chart-toggle ${active ? "modal__chart-toggle--active" : "modal__chart-toggle--inactive"}`}
                style={
                  active
                    ? {
                        borderColor: PLATFORM_COLORS[p],
                        color: PLATFORM_COLORS[p],
                      }
                    : undefined
                }
                onClick={() => togglePlatform(p)}
              >
                {PLATFORM_LABELS[p]}
              </button>
            );
          })}
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            reversed
            domain={[1, "auto"]}
            allowDecimals={false}
            tickFormatter={(v: number) => `#${v}`}
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              `#${value}`,
              PLATFORM_LABELS[name as ChartType] ?? name,
            ]}
            labelStyle={{ color: "var(--color-text-muted)", marginBottom: 4 }}
          />
          {platforms.map((p) =>
            visible.has(p) ? (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={PLATFORM_COLORS[p]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null,
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
