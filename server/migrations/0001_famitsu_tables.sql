CREATE TABLE `famitsu_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`week_of_year` integer NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`report_url` text,
	`scraped_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_famitsu_period` ON `famitsu_reports` (`period_start`,`period_end`);
--> statement-breakpoint
CREATE TABLE `famitsu_software_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`platform` text NOT NULL,
	`weekly_sales` integer,
	`lifetime_sales` integer,
	`is_new` integer DEFAULT false NOT NULL,
	`release_date` text,
	FOREIGN KEY (`report_id`) REFERENCES `famitsu_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_famitsu_software_entry` ON `famitsu_software_entries` (`report_id`,`rank`,`platform`);
--> statement-breakpoint
CREATE INDEX `famitsu_software_game_id_idx` ON `famitsu_software_entries` (`game_id`);
--> statement-breakpoint
CREATE INDEX `famitsu_software_report_id_idx` ON `famitsu_software_entries` (`report_id`);
--> statement-breakpoint
CREATE TABLE `famitsu_hardware_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`platform` text NOT NULL,
	`weekly_sales` integer,
	`lifetime_sales` integer,
	FOREIGN KEY (`report_id`) REFERENCES `famitsu_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_famitsu_hardware_entry` ON `famitsu_hardware_entries` (`report_id`,`rank`);
--> statement-breakpoint
CREATE INDEX `famitsu_hardware_report_id_idx` ON `famitsu_hardware_entries` (`report_id`);
