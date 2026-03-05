import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FamitsuReport } from "../api/types";
import { fetchFamitsuReports } from "../api/famitsu";

export interface FamitsuState {
  reportsQuery: ReturnType<typeof useQuery<FamitsuReport[]>>;
  selectedYear: number | null;
  selectedWeek: number | null;
  section: "software" | "hardware";
  activePlatform: string | null;
  availablePlatforms: string[];
  selectedReportId: number | null;
  handleYearChange: (year: number) => void;
  handleWeekChange: (week: number) => void;
  handleSectionChange: (section: "software" | "hardware") => void;
  handlePlatformChange: (platform: string | null) => void;
  handlePlatformsLoaded: (platforms: string[]) => void;
}

export function useFamitsuState(enabled: boolean): FamitsuState {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [section, setSection] = useState<"software" | "hardware">("software");
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);

  const reportsQuery = useQuery({
    queryKey: ["famitsu-reports"],
    queryFn: () => fetchFamitsuReports(),
    enabled,
  });

  // Auto-select most recent report on load
  useEffect(() => {
    if (!reportsQuery.data || selectedWeek !== null) return;
    const sorted = [...reportsQuery.data].sort(
      (a, b) => b.year - a.year || b.week_of_year - a.week_of_year,
    );
    if (sorted.length > 0) {
      setSelectedYear(sorted[0].year);
      setSelectedWeek(sorted[0].week_of_year);
    }
  }, [reportsQuery.data, selectedWeek]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setActivePlatform(null);
    const weeksForYear = (reportsQuery.data ?? [])
      .filter((r) => r.year === year)
      .sort((a, b) => b.week_of_year - a.week_of_year);
    setSelectedWeek(weeksForYear[0]?.week_of_year ?? null);
  };

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setActivePlatform(null);
  };

  const handleSectionChange = (s: "software" | "hardware") => setSection(s);
  const handlePlatformChange = (platform: string | null) =>
    setActivePlatform(platform);
  const handlePlatformsLoaded = (platforms: string[]) =>
    setAvailablePlatforms(platforms);

  const selectedReportId =
    reportsQuery.data?.find(
      (r) => r.year === selectedYear && r.week_of_year === selectedWeek,
    )?.id ?? null;

  return {
    reportsQuery,
    selectedYear,
    selectedWeek,
    section,
    activePlatform,
    availablePlatforms,
    selectedReportId,
    handleYearChange,
    handleWeekChange,
    handleSectionChange,
    handlePlatformChange,
    handlePlatformsLoaded,
  };
}
