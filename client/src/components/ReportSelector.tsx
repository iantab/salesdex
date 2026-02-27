import type { CircanaReport, ChartType } from "../api/types";
import "./ReportSelector.css";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "overall", label: "Overall" },
  { value: "nintendo", label: "Nintendo" },
  { value: "playstation", label: "PlayStation" },
  { value: "xbox", label: "Xbox" },
];

function monthName(month: number) {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });
}

interface Props {
  reports: CircanaReport[];
  selectedYear: number | null;
  selectedMonth: number | null;
  chartType: ChartType;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onChartTypeChange: (ct: ChartType) => void;
}

export function ReportSelector({
  reports,
  selectedYear,
  selectedMonth,
  chartType,
  onYearChange,
  onMonthChange,
  onChartTypeChange,
}: Props) {
  const years = [...new Set(reports.map((r) => r.year))].sort((a, b) => b - a);
  const monthsForYear = reports
    .filter((r) => r.year === selectedYear && r.month != null)
    .map((r) => r.month as number)
    .sort((a, b) => b - a);

  return (
    <div className="report-selector">
      <div className="report-selector__row">
        <label className="report-selector__label" htmlFor="year-select">
          Year
        </label>
        <select
          id="year-select"
          className="report-selector__select"
          value={selectedYear ?? ""}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <label className="report-selector__label" htmlFor="month-select">
          Month
        </label>
        <select
          id="month-select"
          className="report-selector__select"
          value={selectedMonth ?? ""}
          onChange={(e) => onMonthChange(Number(e.target.value))}
        >
          {monthsForYear.map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="chart-tabs" role="tablist" aria-label="Chart type">
        {CHART_TYPES.map((ct) => (
          <button
            key={ct.value}
            role="tab"
            aria-selected={chartType === ct.value}
            className={`chart-tab${chartType === ct.value ? " chart-tab--active" : ""}`}
            data-platform={ct.value}
            onClick={() => onChartTypeChange(ct.value)}
          >
            {ct.label}
          </button>
        ))}
      </div>
    </div>
  );
}
