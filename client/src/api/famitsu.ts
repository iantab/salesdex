import { apiFetch } from "./client";
import type {
  FamitsuReport,
  FamitsuSoftwareEntry,
  FamitsuHardwareEntry,
  FamitsuTrendEntry,
} from "./types";

export const fetchFamitsuReports = (year?: number) => {
  const params = year ? `?year=${year}` : "";
  return apiFetch<{ data: FamitsuReport[] }>(`/famitsu/reports${params}`).then(
    (r) => r.data,
  );
};

export const fetchFamitsuSoftware = (reportId: number, platform?: string) => {
  const params = new URLSearchParams({ report_id: String(reportId) });
  if (platform) params.set("platform", platform);
  return apiFetch<{ data: FamitsuSoftwareEntry[] }>(
    `/famitsu/software?${params}`,
  ).then((r) => r.data);
};

export const fetchFamitsuHardware = (reportId: number) =>
  apiFetch<{ data: FamitsuHardwareEntry[] }>(
    `/famitsu/hardware?report_id=${reportId}`,
  ).then((r) => r.data);

export const fetchFamitsuTrends = (gameId: number, platform?: string) => {
  const params = new URLSearchParams({ game_id: String(gameId) });
  if (platform) params.set("platform", platform);
  return apiFetch<{ data: FamitsuTrendEntry[] }>(
    `/famitsu/trends?${params}`,
  ).then((r) => r.data);
};
