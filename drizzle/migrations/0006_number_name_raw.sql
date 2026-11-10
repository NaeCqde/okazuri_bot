ALTER TABLE `numbers` ADD `name_raw` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `numbers` SET `name_raw` = `name` WHERE `name_raw` = '';
