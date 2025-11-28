CREATE TABLE `custom_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`baseTemplateId` varchar(100),
	`name` varchar(255) NOT NULL,
	`description` text,
	`structure` text NOT NULL,
	`hashtags` text NOT NULL,
	`targetAudience` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_templates_id` PRIMARY KEY(`id`)
);
