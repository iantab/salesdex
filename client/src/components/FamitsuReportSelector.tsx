import type { FamitsuReport } from "../api/types";
import "./FamitsuReportSelector.css";

interface Props {
  reports: FamitsuReport[];
  selectedYear: number | null;
  selectedWeek: number | null;
  section: "software" | "hardware";
  activePlatform: string | null;
  availablePlatforms: string[];
  onYearChange: (year: number) => void;
  onWeekChange: (week: number) => void;
  onSectionChange: (section: "software" | "hardware") => void;
  onPlatformChange: (platform: string | null) => void;
}

function formatWeekRange(report: FamitsuReport): string {
  const start = new Date(report.period_start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(report.period_end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${start}–${end}`;
}

export function FamitsuReportSelector({
  reports,
  selectedYear,
  selectedWeek,
  section,
  activePlatform,
  availablePlatforms,
  onYearChange,
  onWeekChange,
  onSectionChange,
  onPlatformChange,
}: Props) {
  const years = [...new Set(reports.map((r) => r.year))].sort((a, b) => b - a);

  const reportsForYear = reports
    .filter((r) => r.year === selectedYear)
    .sort((a, b) => a.week_of_year - b.week_of_year);

  return (
    <div className="famitsu-selector">
      <div className="famitsu-selector__row">
        <label
          className="famitsu-selector__label"
          htmlFor="famitsu-year-select"
        >
          Year
        </label>
        <select
          id="famitsu-year-select"
          className="famitsu-selector__select"
          value={selectedYear ?? ""}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <span className="famitsu-selector__label famitsu-selector__label--week">
          Week
        </span>
        <div className="pill-group" role="group" aria-label="Week">
          {reportsForYear.map((r) => (
            <button
              key={r.id}
              className={`pill-btn${selectedWeek === r.week_of_year ? " pill-btn--active" : ""}`}
              onClick={() => onWeekChange(r.week_of_year)}
              aria-pressed={selectedWeek === r.week_of_year}
              title={formatWeekRange(r)}
            >
              W{r.week_of_year}
            </button>
          ))}
        </div>
      </div>

      <hr className="famitsu-selector__divider" />

      <div className="famitsu-selector__bottom-row">
        <div
          className="famitsu-section-tabs"
          role="tablist"
          aria-label="Section"
        >
          {(["software", "hardware"] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={section === s}
              className={`famitsu-section-tab${section === s ? " famitsu-section-tab--active" : ""}`}
              onClick={() => onSectionChange(s)}
            >
              {s === "software" ? "Software" : "Hardware"}
            </button>
          ))}
        </div>

        {section === "software" && availablePlatforms.length > 0 && (
          <div
            className="pill-group famitsu-selector__platforms"
            role="group"
            aria-label="Platform filter"
          >
            <button
              className={`pill-btn${activePlatform === null ? " pill-btn--active" : ""}`}
              onClick={() => onPlatformChange(null)}
              aria-pressed={activePlatform === null}
            >
              All
            </button>
            {availablePlatforms.map((p) => (
              <button
                key={p}
                className={`pill-btn${activePlatform === p ? " pill-btn--active" : ""}`}
                onClick={() => onPlatformChange(p)}
                aria-pressed={activePlatform === p}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
