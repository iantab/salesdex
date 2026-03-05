import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CircanaReport, ChartType } from "../api/types";
import { fetchReports } from "../api/circana";

export interface CircanaState {
  reportsQuery: ReturnType<typeof useQuery<CircanaReport[]>>;
  selectedYear: number | null;
  selectedMonth: number | null;
  chartType: ChartType;
  selectedReportId: number | null;
  handleYearChange: (year: number) => void;
  handleMonthChange: (month: number) => void;
  handleChartTypeChange: (ct: ChartType) => void;
}

export function useCircanaState(): CircanaState {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [chartType, setChartType] = useState<ChartType>("overall");

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
  });

  // Auto-select most recent report on load
  useEffect(() => {
    if (!reportsQuery.data || selectedYear !== null) return;
    const sorted = [...reportsQuery.data]
      .filter((r) => r.month != null)
      .sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0));
    if (sorted.length > 0) {
      setSelectedYear(sorted[0].year);
      setSelectedMonth(sorted[0].month);
    }
  }, [reportsQuery.data, selectedYear]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const monthsForYear = (reportsQuery.data ?? [])
      .filter((r) => r.year === year && r.month != null)
      .map((r) => r.month as number)
      .sort((a, b) => b - a);
    setSelectedMonth(monthsForYear[0] ?? null);
  };

  const handleMonthChange = (month: number) => setSelectedMonth(month);
  const handleChartTypeChange = (ct: ChartType) => setChartType(ct);

  const selectedReportId =
    reportsQuery.data?.find(
      (r) => r.year === selectedYear && r.month === selectedMonth,
    )?.id ?? null;

  return {
    reportsQuery,
    selectedYear,
    selectedMonth,
    chartType,
    selectedReportId,
    handleYearChange,
    handleMonthChange,
    handleChartTypeChange,
  };
}
