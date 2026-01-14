CREATE TABLE `data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` enum('google_photos','dropbox','onedrive','local') NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`albumId` varchar(255),
	`folderId` varchar(255),
	`folderPath` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`dataSourceId` int NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_data_sources_id` PRIMARY KEY(`id`)
);
