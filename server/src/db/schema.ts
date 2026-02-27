import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const games = sqliteTable(
  "games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title_en: text("title_en").notNull(),
    igdb_id: integer("igdb_id"),
    release_date_us: text("release_date_us"),
    cover_url: text("cover_url"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    titleEnIdx: index("games_title_en_idx").on(t.title_en),
  }),
);

export const circana_reports = sqliteTable(
  "circana_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    year: integer("year").notNull(),
    month: integer("month"),
    period_type: text("period_type").notNull(), // 'monthly' | 'annual'
    period_start: text("period_start").notNull(),
    period_end: text("period_end").notNull(),
    tracking_weeks: integer("tracking_weeks"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    uniquePeriod: uniqueIndex("unique_period").on(
      t.year,
      t.month,
      t.period_type,
    ),
  }),
);

export const circana_market_totals = sqliteTable("circana_market_totals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  report_id: integer("report_id")
    .notNull()
    .references(() => circana_reports.id),
  total_market_spend: real("total_market_spend"),
  content_spend: real("content_spend"),
  hardware_spend: real("hardware_spend"),
  accessory_spend: real("accessory_spend"),
  notes: text("notes"),
});

export const circana_entries = sqliteTable(
  "circana_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    report_id: integer("report_id")
      .notNull()
      .references(() => circana_reports.id),
    game_id: integer("game_id")
      .notNull()
      .references(() => games.id),
    chart_type: text("chart_type").notNull(), // 'overall' | 'nintendo' | 'playstation' | 'xbox'
    rank: integer("rank").notNull(),
    last_month_rank: integer("last_month_rank"),
    is_new_entry: integer("is_new_entry", { mode: "boolean" })
      .notNull()
      .default(false),
    flags: text("flags"), // JSON string
  },
  (t) => ({
    gameIdIdx: index("circana_entries_game_id_idx").on(t.game_id),
    chartTypeReportIdx: index("circana_entries_chart_type_report_idx").on(
      t.chart_type,
      t.report_id,
    ),
    // Prevents duplicate entries for the same game+chart in a given report;
    // also makes ingest idempotent via onConflictDoUpdate.
    uniqueEntryIdx: uniqueIndex("unique_circana_entry").on(
      t.report_id,
      t.game_id,
      t.chart_type,
    ),
  }),
);

export const circana_hardware = sqliteTable("circana_hardware", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  report_id: integer("report_id")
    .notNull()
    .references(() => circana_reports.id),
  platform: text("platform").notNull(),
  dollar_rank: integer("dollar_rank"),
  unit_rank: integer("unit_rank"),
  yoy_change_pct: real("yoy_change_pct"),
});
