CREATE TABLE `chatwork_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(32) NOT NULL,
	`accountId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatwork_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatwork_members_room_account_idx` UNIQUE(`roomId`,`accountId`)
);
--> statement-breakpoint
CREATE TABLE `chatwork_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(32) NOT NULL,
	`messageId` varchar(32) NOT NULL,
	`accountId` int NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`sendTime` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatwork_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatwork_messages_room_message_idx` UNIQUE(`roomId`,`messageId`)
);
--> statement-breakpoint
CREATE TABLE `chatwork_ranking_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(32) NOT NULL,
	`weekKey` varchar(16) NOT NULL,
	`postedMessageId` varchar(32),
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatwork_ranking_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatwork_ranking_posts_room_week_idx` UNIQUE(`roomId`,`weekKey`)
);
