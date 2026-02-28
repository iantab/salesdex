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

export interface TrendEntry {
  report_id: number;
  year: number;
  month: number | null;
  period_end: string | null;
  chart_type: ChartType;
  rank: number;
  last_month_rank: number | null;
}
