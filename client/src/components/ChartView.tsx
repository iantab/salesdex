import { useQuery } from "@tanstack/react-query";
import type { ChartType } from "../api/types";
import { fetchCharts, fetchReportDetail } from "../api/circana";
import { GameRow } from "./GameRow";
import { MarketTotals } from "./MarketTotals";
import { Spinner } from "./Spinner";
import { ErrorMessage } from "./ErrorMessage";
import "./ChartView.css";

interface Props {
  reportId: number;
  chartType: ChartType;
}

export function ChartView({ reportId, chartType }: Props) {
  const chartsQuery = useQuery({
    queryKey: ["charts", reportId, chartType],
    queryFn: () => fetchCharts(reportId, chartType),
  });

  const detailQuery = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => fetchReportDetail(reportId),
  });

  const isLoading = chartsQuery.isPending || detailQuery.isPending;
  const error = chartsQuery.error ?? detailQuery.error;

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={(error as Error).message} />;

  const entries = chartsQuery.data ?? [];
  const detail = detailQuery.data;

  return (
    <div className="chart-view">
      {detail?.market_totals && <MarketTotals totals={detail.market_totals} />}

      {entries.length === 0 ? (
        <p className="chart-view__empty">No data for this chart.</p>
      ) : (
        <div className="chart-view__list">
          {entries.map((entry) => (
            <GameRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
