// Re-run `bunx @better-auth/cli generate` then `just database-generate`
// whenever the auth plugin set changes; app-specific tables go here directly.
export * from './auth-schema';

import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Structured-content posts. `content_json` holds a Tiptap/ProseMirror JSON
// document conforming to the schema declared in `$lib/content/schema` at
// the version stored in `schema_version`. Migrations transform doc shape in
// code (see `$lib/content/migrations`), separate from Drizzle SQL migrations.
export const posts = sqliteTable(
	'posts',
	{
		id: text('id').primaryKey(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		contentJson: text('content_json').notNull(),
		schemaVersion: integer('schema_version').notNull().default(1),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' })
	},
	(table) => [index('posts_published_at_idx').on(table.publishedAt)]
);
