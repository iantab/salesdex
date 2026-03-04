export type ChartType = "overall" | "nintendo" | "playstation" | "xbox";

export interface CircanaReport {
  id: number;
  year: number;
  month: number | null;
  period_type: "monthly" | "annual";
  period_start: string | null;
  period_end: string | null;
  tracking_weeks: number | null;
  created_at: string;
}

export interface MarketTotals {
  total_market_spend: number | null;
  content_spend: number | null;
  hardware_spend: number | null;
  accessory_spend: number | null;
  notes: string | null;
}

export interface ReportDetail {
  report: CircanaReport;
  market_totals: MarketTotals | null;
}

export interface GameFlags {
  no_digital?: boolean;
  no_nintendo_digital?: boolean;
  no_nintendo_xbox_digital?: boolean;
}

export interface ChartEntry {
  id: number;
  rank: number;
  last_month_rank: number | null;
  is_new_entry: boolean | null;
  flags: string | null;
  game_id: number;
  title_en: string;
  cover_url: string | null;
}

export interface GameDetail {
  id: number;
  title_en: string;
  igdb_id: number | null;
  release_date_us: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface IgdbDetail {
  igdb_id: number;
  slug: string | null;
  developer: string | null;
  franchise: string | null;
  title_jp: string | null;
  release_date_us: string | null;
  release_date_jp: string | null;
  cover_url: string | null;
}

export interface GameSearchResult {
  id: number;
  title_en: string;
  release_date_us: string | null;
  cover_url: string | null;
}

export interface TrendEntry {
  report_id: number;
  year: number;
  month: number | null;
  period_end: string | null;
  chart_type: ChartType;
  rank: number;
  last_month_rank: number | null;
}

export interface FamitsuReport {
  id: number;
  year: number;
  week_of_year: number;
  period_start: string;
  period_end: string;
  report_url: string | null;
  scraped_at: string | null;
  created_at: string;
}

export interface FamitsuSoftwareEntry {
  id: number;
  rank: number;
  platform: string;
  weekly_sales: number | null;
  lifetime_sales: number | null;
  is_new: boolean | null;
  release_date: string | null;
  game_id: number;
  title_en: string;
  cover_url: string | null;
}

export interface FamitsuHardwareEntry {
  id: number;
  report_id: number;
  rank: number;
  platform: string;
  weekly_sales: number | null;
  lifetime_sales: number | null;
}

export interface FamitsuTrendEntry {
  report_id: number;
  year: number;
  week_of_year: number;
  period_start: string;
  period_end: string;
  rank: number;
  platform: string;
  weekly_sales: number | null;
  lifetime_sales: number | null;
}
