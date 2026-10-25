CREATE TABLE `moderation_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_date` ON `moderation_audit` (`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `entries` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `content_hash` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `last_action_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `entries_public_date` ON `entries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `entries_author_date` ON `entries` (`author`,`created_at`);--> statement-breakpoint
CREATE INDEX `entries_content_hash` ON `entries` (`content_hash`,`created_at`);--> statement-breakpoint
ALTER TABLE `reports` ADD `status` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `last_action_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `reports_status_entry` ON `reports` (`status`,`entry_id`);