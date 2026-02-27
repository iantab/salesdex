import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChartType } from "./api/types";
import { fetchReports } from "./api/circana";
import { ReportSelector } from "./components/ReportSelector";
import { ChartView } from "./components/ChartView";
import { Spinner } from "./components/Spinner";
import { ErrorMessage } from "./components/ErrorMessage";
import "./App.css";

function monthName(month: number) {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });
}

export default function App() {
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

  // When year changes, auto-select most recent month for that year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const monthsForYear = (reportsQuery.data ?? [])
      .filter((r) => r.year === year && r.month != null)
      .map((r) => r.month as number)
      .sort((a, b) => b - a);
    setSelectedMonth(monthsForYear[0] ?? null);
  };

  const selectedReportId =
    reportsQuery.data?.find(
      (r) => r.year === selectedYear && r.month === selectedMonth,
    )?.id ?? null;

  const heading =
    selectedYear && selectedMonth
      ? `${monthName(selectedMonth)} ${selectedYear}`
      : selectedYear
        ? String(selectedYear)
        : "Circana Sales Charts";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Salesdex</h1>
      </header>
      <main className="app-main">
        {reportsQuery.isPending && <Spinner />}
        {reportsQuery.error && (
          <ErrorMessage message={(reportsQuery.error as Error).message} />
        )}
        {reportsQuery.data && (
          <>
            <ReportSelector
              reports={reportsQuery.data}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              chartType={chartType}
              onYearChange={handleYearChange}
              onMonthChange={setSelectedMonth}
              onChartTypeChange={setChartType}
            />
            <h2
              style={{
                fontSize: "1rem",
                color: "var(--color-text-muted)",
                fontWeight: 500,
              }}
            >
              {heading}
            </h2>
            {selectedReportId !== null ? (
              <ChartView reportId={selectedReportId} chartType={chartType} />
            ) : (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  textAlign: "center",
                  padding: "3rem 0",
                }}
              >
                No report data available.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
