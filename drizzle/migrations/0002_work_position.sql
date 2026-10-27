ALTER TABLE `works` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- 既存の作品に並びを入れるため、全体を走査し直す
UPDATE `magazines` SET `completed` = 0;
