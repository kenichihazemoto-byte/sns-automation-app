CREATE TABLE `errorLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`errorType` varchar(100) NOT NULL,
	`errorReason` varchar(255) NOT NULL,
	`errorDetails` text,
	`context` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `errorLogs_id` PRIMARY KEY(`id`)
);
