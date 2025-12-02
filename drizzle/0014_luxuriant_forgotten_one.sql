CREATE TABLE `favorite_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` enum('ハゼモト建設','クリニックアーキプロ') NOT NULL,
	`imageUrl` text NOT NULL,
	`score` int,
	`analysis` text,
	`tags` text,
	`title` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `favorite_images_id` PRIMARY KEY(`id`)
);
