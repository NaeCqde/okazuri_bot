ALTER TABLE `magazines` ADD `cursor_number_id` text;--> statement-breakpoint
ALTER TABLE `magazines` ADD `completed` integer DEFAULT false NOT NULL;