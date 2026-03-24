/* src/lib/database/schema.ts */

import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const contents = sqliteTable('contents', {
  cid: text('cid').primaryKey(),
  type: text('type').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  published: integer('published').notNull().default(0),
})

export const posts = sqliteTable('posts', {
  cid: text('cid')
    .primaryKey()
    .references(() => contents.cid),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  tags: text('tags'),
  content: text('content').notNull(),
})

export const media = sqliteTable('media', {
  hash: text('hash').primaryKey(),
  ext: text('ext').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull(),
})

export const mediaRefs = sqliteTable(
  'media_refs',
  {
    hash: text('hash')
      .notNull()
      .references(() => media.hash),
    cid: text('cid')
      .notNull()
      .references(() => contents.cid),
  },
  (table) => [primaryKey({ columns: [table.hash, table.cid] })],
)
