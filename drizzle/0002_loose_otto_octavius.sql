ALTER TABLE `post_schedules` MODIFY COLUMN `imageId` int;--> statement-breakpoint
ALTER TABLE `post_schedules` MODIFY COLUMN `status` enum('active','pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `companyName` enum('ハゼモト建設','クリニックアーキプロ') NOT NULL;--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `cronExpression` varchar(100);--> statement-breakpoint
ALTER TABLE `post_schedules` ADD `lastExecutedAt` timestamp;