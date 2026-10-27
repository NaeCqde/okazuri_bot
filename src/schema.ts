import type { InferSelectModel } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const magazines = sqliteTable('magazines', {
    id: text().primaryKey().notNull(),
    name: text().notNull(),

    // DLsite の並び(新しい順)で、先頭からここまでの号を保存済み
    cursorNumberId: text('cursor_number_id'),
    // 並びの末尾まで保存し終えたか
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
});

// D1 は読み取った行数に上限(無料枠は1日500万行)があるので、検索に使う列にはインデックスを張る
export const numbers = sqliteTable(
    'numbers',
    {
        id: text().primaryKey().notNull(),
        name: text().notNull(),
        num: integer().notNull(),
        date: integer('date', { mode: 'timestamp' }).notNull(), // 2024年12月08日

        magazineId: text('magazine_id')
            .notNull()
            .references(() => magazines.id),
    },
    (t) => [index('numbers_magazine_id_idx').on(t.magazineId), index('numbers_name_idx').on(t.name)]
);

export const authors = sqliteTable('authors', {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
});

export const works = sqliteTable(
    'works',
    {
        id: text().primaryKey().notNull(),
        name: text().notNull(),
        date: integer('date', { mode: 'timestamp' }).notNull(), // 2024年12月08日

        // 号の中での並び。DLsite の並びで、号に近い(古い)ほうから 1, 2, 3...
        position: integer().notNull().default(0),

        numberId: text('number_id')
            .notNull()
            .references(() => numbers.id),
        authorId: text('author_id')
            .notNull()
            .references(() => authors.id),
    },
    (t) => [index('works_number_id_idx').on(t.numberId), index('works_name_idx').on(t.name)]
);

export type Magazine = InferSelectModel<typeof magazines>;
export type Number = InferSelectModel<typeof numbers>;
export type Author = InferSelectModel<typeof authors>;
export type Work = InferSelectModel<typeof works>;
