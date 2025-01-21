import type { InferSelectModel } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const magazines = sqliteTable('magazines', {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
});

export const numbers = sqliteTable('numbers', {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    num: integer().notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(), // 2024年12月08日

    magazineId: text('magazine_id')
        .notNull()
        .references(() => magazines.id),
});

export const authors = sqliteTable('authors', {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
});

export const works = sqliteTable('works', {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(), // 2024年12月08日

    numberId: text('number_id')
        .notNull()
        .references(() => numbers.id),
    authorId: text('author_id')
        .notNull()
        .references(() => authors.id),
});

export type Magazine = InferSelectModel<typeof magazines>;
export type Number = InferSelectModel<typeof numbers>;
export type Author = InferSelectModel<typeof authors>;
export type Work = InferSelectModel<typeof works>;
