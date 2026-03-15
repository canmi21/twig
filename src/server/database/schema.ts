import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable('posts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').unique().notNull(),
	title: text('title').notNull(),
	content: text('content').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
