CREATE TABLE `upload_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` text,
	`title` varchar(255),
	`photoCount` int NOT NULL,
	`photoData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `upload_history_id` PRIMARY KEY(`id`)
);
