CREATE TABLE `gbp_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`locationName` varchar(255) NOT NULL,
	`accountId` varchar(128),
	`locationId` varchar(128),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isConnected` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gbp_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gbp_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gbpAccountId` int NOT NULL,
	`topicType` enum('STANDARD','EVENT','OFFER') NOT NULL DEFAULT 'STANDARD',
	`summary` text NOT NULL,
	`mediaUrl` text,
	`callToActionType` enum('BOOK','ORDER','SHOP','LEARN_MORE','SIGN_UP','CALL'),
	`callToActionUrl` text,
	`eventTitle` varchar(255),
	`eventStartAt` timestamp,
	`eventEndAt` timestamp,
	`gbpPostId` varchar(255),
	`status` enum('draft','published','failed') NOT NULL DEFAULT 'draft',
	`sourceScheduleId` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gbp_posts_id` PRIMARY KEY(`id`)
);
