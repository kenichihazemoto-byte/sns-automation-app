CREATE TABLE `post_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` enum('ハゼモト建設','クリニックアーキプロ') NOT NULL,
	`title` varchar(255),
	`isBeforeAfter` boolean NOT NULL DEFAULT false,
	`beforeImageUrl` text,
	`afterImageUrl` text,
	`imageUrl` text,
	`instagramContent` text,
	`instagramHashtags` text,
	`xContent` text,
	`xHashtags` text,
	`threadsContent` text,
	`threadsHashtags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_drafts_id` PRIMARY KEY(`id`)
);
