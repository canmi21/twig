import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const contents = sqliteTable(
	'contents',
	{
		cid: text('cid').primaryKey(),
		type: text('type', { enum: ['note', 'post'] }).notNull(),
		status: text('status', { enum: ['draft', 'published'] })
			.notNull()
			.default('draft'),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull(),
	},
	(t) => [index('idx_contents_type_status').on(t.type, t.status)],
)

export const notes = sqliteTable('notes', {
	cid: text('cid')
		.primaryKey()
		.references(() => contents.cid),
	text: text('text').notNull(),
	images: text('images').default('[]'),
})

export const posts = sqliteTable('posts', {
	cid: text('cid')
		.primaryKey()
		.references(() => contents.cid),
	title: text('title').notNull(),
	slug: text('slug').notNull().unique(),
	content: text('content').notNull(),
	summary: text('summary'),
	tags: text('tags').default('[]'),
	cover: text('cover'),
})
