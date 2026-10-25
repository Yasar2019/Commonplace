CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL,
	`author` text NOT NULL,
	`delete_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`reporter` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_once` ON `reports` (`entry_id`,`reporter`);