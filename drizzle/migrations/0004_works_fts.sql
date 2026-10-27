-- 作品名の部分一致検索(/from_work のオートコンプリート)用の全文検索の索引。
-- trigram は3文字ずつ索引するので、日本語でも部分一致が索引で引ける(3文字以上)。
-- works を外部コンテンツにして、works の変更をトリガーで追いかける。
CREATE VIRTUAL TABLE `works_fts` USING fts5(name, content='works', content_rowid='rowid', tokenize='trigram');--> statement-breakpoint
CREATE TRIGGER `works_fts_ai` AFTER INSERT ON `works` BEGIN
    INSERT INTO `works_fts`(rowid, name) VALUES (new.rowid, new.name);
END;--> statement-breakpoint
CREATE TRIGGER `works_fts_ad` AFTER DELETE ON `works` BEGIN
    INSERT INTO `works_fts`(`works_fts`, rowid, name) VALUES ('delete', old.rowid, old.name);
END;--> statement-breakpoint
CREATE TRIGGER `works_fts_au` AFTER UPDATE OF `name` ON `works` BEGIN
    INSERT INTO `works_fts`(`works_fts`, rowid, name) VALUES ('delete', old.rowid, old.name);
    INSERT INTO `works_fts`(rowid, name) VALUES (new.rowid, new.name);
END;--> statement-breakpoint
INSERT INTO `works_fts`(`works_fts`) VALUES ('rebuild');
