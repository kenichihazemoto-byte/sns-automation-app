CREATE TABLE `inspection_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`danchiName` varchar(255) NOT NULL,
	`surveyDate` timestamp NOT NULL DEFAULT (now()),
	`surveyTitle` varchar(255),
	`totalPhotos` int NOT NULL DEFAULT 0,
	`urgentCount` int NOT NULL DEFAULT 0,
	`repairCount` int NOT NULL DEFAULT 0,
	`observeCount` int NOT NULL DEFAULT 0,
	`hammerTestCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_records_id` PRIMARY KEY(`id`)
);

CREATE TABLE `inspection_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionId` int NOT NULL,
	`userId` int NOT NULL,
	`danchiName` varchar(255) NOT NULL,
	`buildingNo` varchar(50),
	`floor` varchar(50),
	`direction` varchar(50),
	`surfaceTypeHint` varchar(50),
	`note` text,
	`fileName` varchar(255),
	`photoUrl` text NOT NULL,
	`photoKey` varchar(500),
	`overallAssessment` varchar(20),
	`surfaceType` varchar(50),
	`confidence` int,
	`summaryJp` text,
	`aiResult` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_photos_id` PRIMARY KEY(`id`)
);

CREATE INDEX `inspection_records_user_danchi_idx` ON `inspection_records` (`userId`, `danchiName`, `surveyDate`);
CREATE INDEX `inspection_photos_lookup_idx` ON `inspection_photos` (`userId`, `danchiName`, `buildingNo`, `direction`);
CREATE INDEX `inspection_photos_record_idx` ON `inspection_photos` (`inspectionId`);
