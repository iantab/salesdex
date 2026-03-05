import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChartType } from "../api/types";
import { fetchCharts, fetchReportDetail } from "../api/circana";
import { GameRow } from "./GameRow";
import { GameModal } from "./GameModal";
import { MarketTotals } from "./MarketTotals";
import { SkeletonRow } from "./SkeletonRow";
import { ErrorMessage } from "./ErrorMessage";
import "./ChartView.css";

interface Props {
  reportId: number;
  chartType: ChartType;
}

export function ChartView({ reportId, chartType }: Props) {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const chartsQuery = useQuery({
    queryKey: ["charts", reportId, chartType],
    queryFn: () => fetchCharts(reportId, chartType),
  });

  const detailQuery = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => fetchReportDetail(reportId),
  });

  const error = chartsQuery.error ?? detailQuery.error;

  if (chartsQuery.isPending) {
    return (
      <div className="chart-view">
        <div className="chart-view__list">
          {Array.from({ length: 10 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorMessage error={error} />;

  const entries = chartsQuery.data ?? [];
  const detail = detailQuery.data;
  const hasAnyFlags = entries.some((e) => e.flags != null && e.flags !== "");

  return (
    <>
      <div className="chart-view">
        {detail?.market_totals && (
          <MarketTotals totals={detail.market_totals} />
        )}

        {entries.length === 0 ? (
          <p className="chart-view__empty">No data for this chart.</p>
        ) : (
          <>
            <div className="chart-view__list">
              {entries.map((entry) => (
                <GameRow
                  key={entry.id}
                  entry={entry}
                  onClick={() => setSelectedGameId(entry.game_id)}
                />
              ))}
            </div>
            {hasAnyFlags && (
              <div className="digital-legend">
                <div className="digital-legend__title">
                  ⓘ Digital Data Notes
                </div>
                <div className="digital-legend__items">
                  <div className="digital-legend__item">
                    <strong>No Digital</strong> — Physical sales only; digital
                    revenue excluded entirely.
                  </div>
                  <div className="digital-legend__item">
                    <strong>No Nintendo Digital</strong> — Nintendo eShop sales
                    excluded; other platforms' digital included.
                  </div>
                  <div className="digital-legend__item">
                    <strong>No N+X Digital</strong> — Nintendo &amp; Xbox
                    digital excluded; PlayStation digital sales included.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {selectedGameId !== null && (
        <GameModal
          gameId={selectedGameId}
          onClose={() => setSelectedGameId(null)}
        />
      )}
    </>
  );
}
