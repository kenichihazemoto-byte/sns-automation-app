CREATE TABLE `approval_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`draftPostId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`action` enum('approved','rejected') NOT NULL,
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `draft_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageId` int,
	`companyName` enum('ハゼモト建設','クリニックアーキプロ') NOT NULL,
	`platform` enum('instagram','x','threads') NOT NULL,
	`postContent` text NOT NULL,
	`hashtags` text NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`isBeforeAfter` boolean NOT NULL DEFAULT false,
	`beforeImageUrl` text,
	`afterImageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `draft_posts_id` PRIMARY KEY(`id`)
);
