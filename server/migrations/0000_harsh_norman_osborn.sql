CREATE TABLE `circana_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`chart_type` text NOT NULL,
	`rank` integer NOT NULL,
	`last_month_rank` integer,
	`is_new_entry` integer DEFAULT false NOT NULL,
	`flags` text,
	FOREIGN KEY (`report_id`) REFERENCES `circana_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `circana_hardware` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`platform` text NOT NULL,
	`dollar_rank` integer,
	`unit_rank` integer,
	`yoy_change_pct` real,
	FOREIGN KEY (`report_id`) REFERENCES `circana_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `circana_market_totals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`total_market_spend` real,
	`content_spend` real,
	`hardware_spend` real,
	`accessory_spend` real,
	`notes` text,
	FOREIGN KEY (`report_id`) REFERENCES `circana_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `circana_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`month` integer,
	`period_type` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`tracking_weeks` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_period` ON `circana_reports` (`year`,`month`,`period_type`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_en` text NOT NULL,
	`title_jp` text,
	`publisher_id` integer,
	`developer` text,
	`franchise` text,
	`igdb_id` integer,
	`release_date_us` text,
	`release_date_jp` text,
	`cover_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`publisher_id`) REFERENCES `publishers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `publishers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`parent_company` text,
	`country` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publishers_name_unique` ON `publishers` (`name`);