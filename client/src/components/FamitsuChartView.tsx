import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFamitsuSoftware, fetchFamitsuHardware } from "../api/famitsu";
import { FamitsuGameRow } from "./FamitsuGameRow";
import { SkeletonRow } from "./SkeletonRow";
import { ErrorMessage } from "./ErrorMessage";
import "./FamitsuChartView.css";

function formatSales(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

interface Props {
  reportId: number;
  section: "software" | "hardware";
  activePlatform: string | null;
  onGameClick: (gameId: number) => void;
  onPlatformsLoaded: (platforms: string[]) => void;
}

export function FamitsuChartView({
  reportId,
  section,
  activePlatform,
  onGameClick,
  onPlatformsLoaded,
}: Props) {
  // Fetch filtered software (for display)
  const softwareQuery = useQuery({
    queryKey: ["famitsu-software", reportId, activePlatform],
    queryFn: () => fetchFamitsuSoftware(reportId, activePlatform ?? undefined),
    enabled: section === "software",
  });

  // Fetch unfiltered software (to derive available platforms)
  const allSoftwareQuery = useQuery({
    queryKey: ["famitsu-software", reportId, null],
    queryFn: () => fetchFamitsuSoftware(reportId, undefined),
    enabled: section === "software",
  });

  const hardwareQuery = useQuery({
    queryKey: ["famitsu-hardware", reportId],
    queryFn: () => fetchFamitsuHardware(reportId),
    enabled: section === "hardware",
  });

  // Notify parent of available platforms using a ref to prevent stale-closure
  // re-notifications on every render. We only call the callback when the
  // derived platform list actually changes.
  const lastPlatformKey = useRef<string | null>(null);
  useEffect(() => {
    if (!allSoftwareQuery.data) return;
    const platforms = [
      ...new Set(allSoftwareQuery.data.map((e) => e.platform)),
    ].sort();
    const key = platforms.join(",");
    if (key !== lastPlatformKey.current) {
      lastPlatformKey.current = key;
      onPlatformsLoaded(platforms);
    }
  }, [allSoftwareQuery.data, onPlatformsLoaded]);

  if (section === "software") {
    if (softwareQuery.isPending) {
      return (
        <div className="famitsu-chart-view">
          <div className="famitsu-chart-view__list">
            {Array.from({ length: 10 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      );
    }
    if (softwareQuery.error)
      return <ErrorMessage error={softwareQuery.error} />;

    const entries = softwareQuery.data ?? [];
    return (
      <div className="famitsu-chart-view">
        {entries.length === 0 ? (
          <p className="famitsu-chart-view__empty">
            No software data for this report.
          </p>
        ) : (
          <div className="famitsu-chart-view__list">
            <div className="famitsu-chart-view__list-header">
              <span>Weekly Sales</span>
            </div>
            {entries.map((entry) => (
              <FamitsuGameRow
                key={entry.id}
                entry={entry}
                onClick={() => onGameClick(entry.game_id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Hardware section
  if (hardwareQuery.isPending) {
    return (
      <div className="famitsu-chart-view">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }
  if (hardwareQuery.error) return <ErrorMessage error={hardwareQuery.error} />;

  const hwEntries = hardwareQuery.data ?? [];
  return (
    <div className="famitsu-chart-view">
      {hwEntries.length === 0 ? (
        <p className="famitsu-chart-view__empty">
          No hardware data for this report.
        </p>
      ) : (
        <div className="famitsu-chart-view__list">
          <table className="famitsu-hw-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Platform</th>
                <th>Weekly</th>
                <th>Lifetime</th>
              </tr>
            </thead>
            <tbody>
              {hwEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="famitsu-hw-table__rank">{entry.rank}</td>
                  <td>{entry.platform}</td>
                  <td className="famitsu-hw-table__sales">
                    {formatSales(entry.weekly_sales)}
                  </td>
                  <td className="famitsu-hw-table__sales">
                    {formatSales(entry.lifetime_sales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
