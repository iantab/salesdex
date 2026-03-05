CREATE TABLE `game_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`release_date_us` text,
	`publisher` text,
	`developer` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_details_game_id_idx` ON `game_details` (`game_id`);
--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `release_date_us`;
--> statement-breakpoint
ALTER TABLE `famitsu_software_entries` DROP COLUMN `release_date`;
