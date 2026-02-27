import { apiFetch } from "./client";
import type {
  CircanaReport,
  ChartEntry,
  ReportDetail,
  ChartType,
} from "./types";

export const fetchReports = () =>
  apiFetch<{ data: CircanaReport[] }>("/circana/reports").then((r) => r.data);

export const fetchCharts = (reportId: number, chartType: ChartType) =>
  apiFetch<{ data: ChartEntry[] }>(
    `/circana/charts?report_id=${reportId}&chart_type=${chartType}`,
  ).then((r) => r.data);

export const fetchReportDetail = (id: number) =>
  apiFetch<{ data: ReportDetail }>(`/circana/reports/${id}`).then(
    (r) => r.data,
  );
