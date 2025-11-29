ALTER TABLE `post_history` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `notificationSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `reminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `isBeforeAfter` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `beforeImageUrl` text;--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `afterImageUrl` text;