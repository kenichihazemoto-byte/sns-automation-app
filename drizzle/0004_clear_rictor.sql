ALTER TABLE `post_schedules` MODIFY COLUMN `status` enum('draft','scheduled','active','pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `sns_accounts` ADD `companyName` enum('ハゼモト建設','クリニックアーキプロ') NOT NULL;--> statement-breakpoint
ALTER TABLE `sns_accounts` ADD `accountId` varchar(255);--> statement-breakpoint
ALTER TABLE `sns_accounts` DROP COLUMN `platformUserId`;