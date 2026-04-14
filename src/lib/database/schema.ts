/* src/lib/database/schema.ts */

import {
  index,
  sqliteTable,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { user } from './auth-schema'

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
  contentHash: text('content_hash').notNull().default(''),
  tweet: text('tweet'),
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

// Flat key/value mirror of the presence DO's persistent state. Only
// populated by manual admin snapshots from the dashboard; the hot path
// of /visit, /last-geo, and /count never touches this table. The keys
// here are the exact DO storage keys (visit-count, last-geo, tile:*,
// read-count:*) and values are their JSON-stringified payloads.
export const doBackup = sqliteTable('do_backup', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postCid: text('post_cid')
      .notNull()
      .references(() => contents.cid),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    content: text('content').notNull(),
    parentId: text('parent_id'),
    status: text('status').notNull().default('pending'),
    userAgent: text('user_agent').notNull().default(''),
    location: text('location').notNull().default(''),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('comments_post_cid_idx').on(table.postCid),
    index('comments_user_id_idx').on(table.userId),
    index('comments_parent_id_idx').on(table.parentId),
  ],
)
