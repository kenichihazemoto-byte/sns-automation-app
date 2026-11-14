CREATE TABLE `budget_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectName` varchar(255) NOT NULL DEFAULT '',
	`files` text NOT NULL,
	`memo` text,
	`result` mediumtext NOT NULL,
	`findingCount` int NOT NULL DEFAULT 0,
	`highCount` int NOT NULL DEFAULT 0,
	`grossProfitRate10` int,
	`resolved` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budget_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `budget_checks_user_created_idx` ON `budget_checks` (`userId`,`createdAt`);