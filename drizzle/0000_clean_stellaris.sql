CREATE TABLE `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `id` ON `authors` (`id`);--> statement-breakpoint
CREATE TABLE `magazines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`date` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `id` ON `magazines` (`id`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`date` integer,
	`magazine_id` text NOT NULL,
	`author_id` text NOT NULL,
	FOREIGN KEY (`magazine_id`) REFERENCES `magazines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `id` ON `works` (`id`);