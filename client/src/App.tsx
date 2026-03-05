import { useState } from "react";
import { useCircanaState } from "./hooks/useCircanaState";
import { useFamitsuState } from "./hooks/useFamitsuState";
import { monthName } from "./utils/date";
import { ReportSelector } from "./components/ReportSelector";
import { ChartView } from "./components/ChartView";
import { FamitsuReportSelector } from "./components/FamitsuReportSelector";
import { FamitsuChartView } from "./components/FamitsuChartView";
import { GameSearch } from "./components/GameSearch";
import { GameModal } from "./components/GameModal";
import { Spinner } from "./components/Spinner";
import { ErrorMessage } from "./components/ErrorMessage";
import "./App.css";

export default function App() {
  const [region, setRegion] = useState<"usa" | "japan">("usa");
  const [famitsuSelectedGameId, setFamitsuSelectedGameId] = useState<
    number | null
  >(null);

  const circana = useCircanaState();
  const famitsu = useFamitsuState(region === "japan");

  const heading =
    circana.selectedYear && circana.selectedMonth
      ? `${monthName(circana.selectedMonth)} ${circana.selectedYear}`
      : circana.selectedYear
        ? String(circana.selectedYear)
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
            {circana.reportsQuery.isPending && <Spinner />}
            {circana.reportsQuery.error && (
              <ErrorMessage error={circana.reportsQuery.error} />
            )}
            {circana.reportsQuery.data && (
              <>
                <ReportSelector
                  reports={circana.reportsQuery.data}
                  selectedYear={circana.selectedYear}
                  selectedMonth={circana.selectedMonth}
                  chartType={circana.chartType}
                  onYearChange={circana.handleYearChange}
                  onMonthChange={circana.handleMonthChange}
                  onChartTypeChange={circana.handleChartTypeChange}
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
                {circana.selectedReportId !== null ? (
                  <ChartView
                    reportId={circana.selectedReportId}
                    chartType={circana.chartType}
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
            {famitsu.reportsQuery.isPending && <Spinner />}
            {famitsu.reportsQuery.error && (
              <ErrorMessage error={famitsu.reportsQuery.error} />
            )}
            {famitsu.reportsQuery.data && (
              <>
                <FamitsuReportSelector
                  reports={famitsu.reportsQuery.data}
                  selectedYear={famitsu.selectedYear}
                  selectedWeek={famitsu.selectedWeek}
                  section={famitsu.section}
                  activePlatform={famitsu.activePlatform}
                  availablePlatforms={famitsu.availablePlatforms}
                  onYearChange={famitsu.handleYearChange}
                  onWeekChange={famitsu.handleWeekChange}
                  onSectionChange={famitsu.handleSectionChange}
                  onPlatformChange={famitsu.handlePlatformChange}
                />
                {famitsu.selectedReportId !== null ? (
                  <FamitsuChartView
                    reportId={famitsu.selectedReportId}
                    section={famitsu.section}
                    activePlatform={famitsu.activePlatform}
                    onGameClick={setFamitsuSelectedGameId}
                    onPlatformsLoaded={famitsu.handlePlatformsLoaded}
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
          source="famitsu"
        />
      )}
    </div>
  );
}
