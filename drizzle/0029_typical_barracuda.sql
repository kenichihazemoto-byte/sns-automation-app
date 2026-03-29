CREATE TABLE `hp_link_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`constructionCasesUrl` text,
	`visitReservationUrl` text,
	`catalogRequestUrl` text,
	`googleReviewUrl` text,
	`modelHouseUrl` text,
	`companyTopUrl` text,
	`enableInstagram` boolean NOT NULL DEFAULT true,
	`enableX` boolean NOT NULL DEFAULT true,
	`enableThreads` boolean NOT NULL DEFAULT true,
	`enableGbp` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hp_link_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `hp_link_settings_userId_unique` UNIQUE(`userId`)
);
