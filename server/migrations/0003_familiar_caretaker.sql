CREATE INDEX `circana_entries_game_id_idx` ON `circana_entries` (`game_id`);--> statement-breakpoint
CREATE INDEX `circana_entries_chart_type_report_idx` ON `circana_entries` (`chart_type`,`report_id`);--> statement-breakpoint
CREATE INDEX `games_title_en_idx` ON `games` (`title_en`);