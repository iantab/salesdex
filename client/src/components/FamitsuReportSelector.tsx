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
  const parseLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(parseLocal(report.period_start))}–${fmt(parseLocal(report.period_end))}`;
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

        <label
          className="famitsu-selector__label famitsu-selector__label--week"
          htmlFor="famitsu-week-select"
        >
          Week
        </label>
        <select
          id="famitsu-week-select"
          className="famitsu-selector__select"
          value={selectedWeek ?? ""}
          onChange={(e) => onWeekChange(Number(e.target.value))}
        >
          {reportsForYear.map((r) => (
            <option key={r.id} value={r.week_of_year}>
              {formatWeekRange(r)}
            </option>
          ))}
        </select>
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
