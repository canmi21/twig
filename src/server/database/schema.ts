import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const baseContent = sqliteTable('base_content', {
	id: text('id').primaryKey(),
	type: text('type').notNull(),
	title: text('title'),
	content: text('content').notNull(),
	summary: text('summary'),
	tags: text('tags').notNull().default('[]'),
	coverImage: text('cover_image'),
	slug: text('slug').unique(),
	isDraft: integer('is_draft').notNull().default(0),
	isPinned: integer('is_pinned').notNull().default(0),
	metadata: text('metadata').notNull().default('{}'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
	publishedAt: text('published_at'),
})

export const projectExtension = sqliteTable('project_extension', {
	id: text('id').primaryKey(),
	contentId: text('content_id')
		.notNull()
		.references(() => baseContent.id),
	status: text('status').notNull().default('active'),
	demoUrl: text('demo_url'),
	repoUrl: text('repo_url'),
	techStack: text('tech_stack').notNull().default('[]'),
	screenshots: text('screenshots').notNull().default('[]'),
	role: text('role'),
})

export const mediaExtension = sqliteTable('media_extension', {
	id: text('id').primaryKey(),
	contentId: text('content_id')
		.notNull()
		.references(() => baseContent.id),
	mediaType: text('media_type').notNull(),
	rating: integer('rating'),
	creator: text('creator'),
	cover: text('cover'),
	year: integer('year'),
	comment: text('comment'),
	finishedAt: text('finished_at'),
})

export const links = sqliteTable('links', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	avatar: text('avatar'),
	description: text('description'),
	category: text('category').notNull(),
	createdAt: text('created_at').notNull(),
})

export const siteSettings = sqliteTable('site_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
})

export const guestbookEntries = sqliteTable('guestbook_entries', {
	id: text('id').primaryKey(),
	nickname: text('nickname').notNull(),
	avatar: text('avatar'),
	content: text('content').notNull(),
	website: text('website'),
	createdAt: text('created_at').notNull(),
})
