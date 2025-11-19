ALTER TABLE `post_history` ADD `postContentId` int;--> statement-breakpoint
ALTER TABLE `post_history` ADD `postId` varchar(255);--> statement-breakpoint
ALTER TABLE `post_history` ADD `postUrl` text;--> statement-breakpoint
ALTER TABLE `post_history` ADD `status` enum('published','failed') NOT NULL;--> statement-breakpoint
ALTER TABLE `post_history` DROP COLUMN `snsAccountId`;--> statement-breakpoint
ALTER TABLE `post_history` DROP COLUMN `platformPostId`;--> statement-breakpoint
ALTER TABLE `post_history` DROP COLUMN `publishedAt`;