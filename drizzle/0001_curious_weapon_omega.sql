CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postHistoryId` int NOT NULL,
	`likes` int NOT NULL DEFAULT 0,
	`comments` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	`views` int NOT NULL DEFAULT 0,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cloud_storage_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('google_drive','dropbox') NOT NULL,
	`folderPath` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cloud_storage_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postHistoryId` int NOT NULL,
	`platformCommentId` varchar(255) NOT NULL,
	`authorName` varchar(255),
	`content` text NOT NULL,
	`replyStatus` enum('pending','replied','ignored') NOT NULL DEFAULT 'pending',
	`replyContent` text,
	`repliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cloudStorageConfigId` int NOT NULL,
	`originalUrl` text NOT NULL,
	`s3Url` text,
	`s3Key` text,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`analysisResult` text,
	`imageCategory` varchar(100),
	`imageStyle` varchar(100),
	`isUsed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postScheduleId` int NOT NULL,
	`platform` enum('instagram','x','threads') NOT NULL,
	`caption` text NOT NULL,
	`hashtags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postScheduleId` int NOT NULL,
	`snsAccountId` int NOT NULL,
	`platform` enum('instagram','x','threads') NOT NULL,
	`platformPostId` varchar(255),
	`publishedAt` timestamp NOT NULL,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','processing','published','failed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sns_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('instagram','x','threads') NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`apiKey` text,
	`apiSecret` text,
	`accessToken` text,
	`accessTokenSecret` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`platformUserId` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sns_accounts_id` PRIMARY KEY(`id`)
);
