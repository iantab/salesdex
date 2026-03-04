import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChartType } from "./api/types";
import { fetchReports } from "./api/circana";
import { fetchFamitsuReports } from "./api/famitsu";
import { ReportSelector } from "./components/ReportSelector";
import { ChartView } from "./components/ChartView";
import { FamitsuReportSelector } from "./components/FamitsuReportSelector";
import { FamitsuChartView } from "./components/FamitsuChartView";
import { GameSearch } from "./components/GameSearch";
import { GameModal } from "./components/GameModal";
import { Spinner } from "./components/Spinner";
import { ErrorMessage } from "./components/ErrorMessage";
import "./App.css";

function monthName(month: number) {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });
}

export default function App() {
  const [region, setRegion] = useState<"usa" | "japan">("usa");

  // USA / Circana state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [chartType, setChartType] = useState<ChartType>("overall");

  // Japan / Famitsu state
  const [famitsuSelectedYear, setFamitsuSelectedYear] = useState<number | null>(
    null,
  );
  const [famitsuSelectedWeek, setFamitsuSelectedWeek] = useState<number | null>(
    null,
  );
  const [famitsuSection, setFamitsuSection] = useState<"software" | "hardware">(
    "software",
  );
  const [famitsuActivePlatform, setFamitsuActivePlatform] = useState<
    string | null
  >(null);
  const [famitsuAvailablePlatforms, setFamitsuAvailablePlatforms] = useState<
    string[]
  >([]);
  const [famitsuSelectedGameId, setFamitsuSelectedGameId] = useState<
    number | null
  >(null);

  // USA queries
  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
  });

  // Japan queries
  const famitsuReportsQuery = useQuery({
    queryKey: ["famitsu-reports"],
    queryFn: () => fetchFamitsuReports(),
    enabled: region === "japan",
  });

  // Auto-select most recent Circana report on load
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

  // Auto-select most recent Famitsu report on load
  useEffect(() => {
    if (!famitsuReportsQuery.data || famitsuSelectedWeek !== null) return;
    const sorted = [...famitsuReportsQuery.data].sort(
      (a, b) => b.year - a.year || b.week_of_year - a.week_of_year,
    );
    if (sorted.length > 0) {
      setFamitsuSelectedYear(sorted[0].year);
      setFamitsuSelectedWeek(sorted[0].week_of_year);
    }
  }, [famitsuReportsQuery.data, famitsuSelectedWeek]);

  // When Circana year changes, auto-select most recent month for that year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const monthsForYear = (reportsQuery.data ?? [])
      .filter((r) => r.year === year && r.month != null)
      .map((r) => r.month as number)
      .sort((a, b) => b - a);
    setSelectedMonth(monthsForYear[0] ?? null);
  };

  // When Famitsu year changes, auto-select most recent week for that year
  const handleFamitsuYearChange = (year: number) => {
    setFamitsuSelectedYear(year);
    setFamitsuActivePlatform(null);
    const weeksForYear = (famitsuReportsQuery.data ?? [])
      .filter((r) => r.year === year)
      .sort((a, b) => b.week_of_year - a.week_of_year);
    setFamitsuSelectedWeek(weeksForYear[0]?.week_of_year ?? null);
  };

  const handleFamitsuWeekChange = (week: number) => {
    setFamitsuSelectedWeek(week);
    setFamitsuActivePlatform(null);
  };

  const selectedReportId =
    reportsQuery.data?.find(
      (r) => r.year === selectedYear && r.month === selectedMonth,
    )?.id ?? null;

  const famitsuSelectedReportId =
    famitsuReportsQuery.data?.find(
      (r) =>
        r.year === famitsuSelectedYear &&
        r.week_of_year === famitsuSelectedWeek,
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
        <div className="app-header__left">
          <h1>Salesdex</h1>
          <p className="app-header__tagline">
            {region === "usa"
              ? "US video game sales rankings — powered by Circana data"
              : "Japan video game sales rankings — powered by Famitsu data"}
          </p>
        </div>
        <div className="app-header__right">
          <div className="region-toggle" role="group" aria-label="Region">
            <button
              className={`region-btn${region === "usa" ? " region-btn--active" : ""}`}
              onClick={() => setRegion("usa")}
              aria-pressed={region === "usa"}
            >
              🇺🇸 USA
            </button>
            <button
              className={`region-btn${region === "japan" ? " region-btn--active" : ""}`}
              onClick={() => setRegion("japan")}
              aria-pressed={region === "japan"}
            >
              🇯🇵 Japan
            </button>
          </div>
          <GameSearch />
        </div>
      </header>

      <main className="app-main">
        {region === "usa" && (
          <>
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
                  <ChartView
                    reportId={selectedReportId}
                    chartType={chartType}
                  />
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
          </>
        )}

        {region === "japan" && (
          <>
            {famitsuReportsQuery.isPending && <Spinner />}
            {famitsuReportsQuery.error && (
              <ErrorMessage
                message={(famitsuReportsQuery.error as Error).message}
              />
            )}
            {famitsuReportsQuery.data && (
              <>
                <FamitsuReportSelector
                  reports={famitsuReportsQuery.data}
                  selectedYear={famitsuSelectedYear}
                  selectedWeek={famitsuSelectedWeek}
                  section={famitsuSection}
                  activePlatform={famitsuActivePlatform}
                  availablePlatforms={famitsuAvailablePlatforms}
                  onYearChange={handleFamitsuYearChange}
                  onWeekChange={handleFamitsuWeekChange}
                  onSectionChange={setFamitsuSection}
                  onPlatformChange={setFamitsuActivePlatform}
                />
                {famitsuSelectedReportId !== null ? (
                  <FamitsuChartView
                    reportId={famitsuSelectedReportId}
                    section={famitsuSection}
                    activePlatform={famitsuActivePlatform}
                    onGameClick={setFamitsuSelectedGameId}
                    onPlatformsLoaded={setFamitsuAvailablePlatforms}
                  />
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
          </>
        )}
      </main>

      {famitsuSelectedGameId !== null && (
        <GameModal
          gameId={famitsuSelectedGameId}
          onClose={() => setFamitsuSelectedGameId(null)}
        />
      )}
    </div>
  );
}
