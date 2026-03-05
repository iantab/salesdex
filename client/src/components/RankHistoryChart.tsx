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

/**
 * A normalized point on the chart. `sortKey` is used for ordering;
 * `label` is the display string. Any additional string keys are platform
 * names whose values are the rank at that point in time.
 */
export interface ChartPoint {
  label: string;
  sortKey: string;
  [series: string]: number | string | undefined;
}

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface Props {
  /** Pre-normalized chart data; one point per time period. */
  data: ChartPoint[];
  /** Series (platform/chart-type) metadata — key, display label, color. */
  series: SeriesConfig[];
}

export function RankHistoryChart({ data, series }: Props) {
  const [visible, setVisible] = React.useState<Set<string>>(
    new Set(series.map((s) => s.key)),
  );

  function toggleSeries(key: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div>
      {series.length > 1 && (
        <div className="modal__chart-toggles">
          {series.map((s) => {
            const active = visible.has(s.key);
            return (
              <button
                key={s.key}
                className={`modal__chart-toggle ${active ? "modal__chart-toggle--active" : "modal__chart-toggle--inactive"}`}
                style={
                  active ? { borderColor: s.color, color: s.color } : undefined
                }
                onClick={() => toggleSeries(s.key)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={data}
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
            formatter={(
              value: number | undefined,
              name: string | undefined,
            ) => {
              const seriesLabel =
                series.find((s) => s.key === name)?.label ?? name ?? "";
              return [value != null ? `#${value}` : "—", seriesLabel];
            }}
            labelStyle={{ color: "var(--color-text-muted)", marginBottom: 4 }}
          />
          {series.map((s) =>
            visible.has(s.key) ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
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
