CREATE TABLE `template_performance_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`dataSourceId` int,
	`generationDate` timestamp NOT NULL,
	`totalAttempts` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`platform` enum('instagram','x','threads'),
	`companyName` enum('ハゼモト建設','クリニックアーキプロ'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_performance_stats_id` PRIMARY KEY(`id`)
);
