ALTER TABLE `analytics` ADD `engagementRate` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `analytics` ADD `hourOfDay` int;--> statement-breakpoint
ALTER TABLE `analytics` ADD `dayOfWeek` int;--> statement-breakpoint
ALTER TABLE `images` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `upload_history` ADD `tags` text;