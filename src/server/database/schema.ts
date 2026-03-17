import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const config = sqliteTable('config', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
})

export const contents = sqliteTable(
	'contents',
	{
		cid: text('cid').primaryKey(),
		createdAt: text('created_at').notNull(),
		status: text('status', { enum: ['draft', 'published'] })
			.notNull()
			.default('draft'),
		type: text('type', { enum: ['note', 'post'] }).notNull(),
		updatedAt: text('updated_at').notNull(),
	},
	(t) => [index('idx_contents_type_status').on(t.type, t.status)],
)

export const notes = sqliteTable('notes', {
	cid: text('cid')
		.primaryKey()
		.references(() => contents.cid),
	images: text('images').default('[]'),
	text: text('text').notNull(),
})

export const posts = sqliteTable('posts', {
	cid: text('cid')
		.primaryKey()
		.references(() => contents.cid),
	content: text('content').notNull(),
	cover: text('cover'),
	slug: text('slug').notNull().unique(),
	summary: text('summary'),
	tags: text('tags').default('[]'),
	title: text('title').notNull(),
})
