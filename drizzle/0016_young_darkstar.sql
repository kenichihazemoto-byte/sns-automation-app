CREATE TABLE `post_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`companyName` enum('ハゼモト建設','クリニックアーキプロ') NOT NULL,
	`isBeforeAfter` boolean NOT NULL DEFAULT false,
	`instagramCaption` text,
	`instagramHashtags` text,
	`xCaption` text,
	`xHashtags` text,
	`threadsCaption` text,
	`threadsHashtags` text,
	`defaultPostTime` varchar(5),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_templates_id` PRIMARY KEY(`id`)
);
