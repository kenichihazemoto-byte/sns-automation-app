CREATE TABLE `notion_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`integrationToken` text NOT NULL,
	`databaseId` varchar(64) NOT NULL,
	`databaseTitle` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notion_settings_id` PRIMARY KEY(`id`)
);
