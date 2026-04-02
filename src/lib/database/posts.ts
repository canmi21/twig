/* src/lib/database/posts.ts */

import { and, eq, count, desc, sql } from 'drizzle-orm'
import type { Db } from './index'
import { contents, posts } from './schema'
import { newCid } from '../utils/uuid'

export interface UpsertPostInput {
  slug: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  content: string
  contentHash: string
  cid?: string
  createdAt?: string
  updatedAt?: string
  published?: boolean
}

export interface UpsertPostResult {
  cid: string
  slug: string
  action: 'created' | 'updated'
}

export interface PostRow {
  cid: string
  slug: string
  title: string
  description: string | null
  category: string | null
  tags: string | null
  content: string
  contentHash: string
  createdAt: string
  updatedAt: string
  published: number
}

export async function getAllPosts(db: Db): Promise<PostRow[]> {
  return db
    .select({
      cid: posts.cid,
      slug: posts.slug,
      title: posts.title,
      description: posts.description,
      category: posts.category,
      tags: posts.tags,
      content: posts.content,
      contentHash: posts.contentHash,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      published: contents.published,
    })
    .from(posts)
    .innerJoin(contents, eq(posts.cid, contents.cid))
    .all()
}

export async function getPostByCid(
  db: Db,
  cid: string,
): Promise<PostRow | undefined> {
  return db
    .select({
      cid: posts.cid,
      slug: posts.slug,
      title: posts.title,
      description: posts.description,
      category: posts.category,
      tags: posts.tags,
      content: posts.content,
      contentHash: posts.contentHash,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      published: contents.published,
    })
    .from(posts)
    .innerJoin(contents, eq(posts.cid, contents.cid))
    .where(eq(posts.cid, cid))
    .get()
}

export async function setPublished(
  db: Db,
  cid: string,
  published: boolean,
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .update(contents)
    .set({ published: published ? 1 : 0, updatedAt: now })
    .where(eq(contents.cid, cid))
}

export async function deletePost(db: Db, cid: string): Promise<void> {
  await db.delete(posts).where(eq(posts.cid, cid))
  await db.delete(contents).where(eq(contents.cid, cid))
}

export async function upsertPost(
  db: Db,
  input: UpsertPostInput,
): Promise<UpsertPostResult> {
  const now = new Date().toISOString()
  const tagsJson = input.tags ? JSON.stringify(input.tags) : null

  // Match by cid first, then by slug
  let existing: { cid: string } | undefined
  if (input.cid) {
    existing = await db
      .select({ cid: posts.cid })
      .from(posts)
      .where(eq(posts.cid, input.cid))
      .get()
  }
  if (!existing) {
    existing = await db
      .select({ cid: posts.cid })
      .from(posts)
      .where(eq(posts.slug, input.slug))
      .get()
  }

  if (existing) {
    // Determine updated_at
    const dbRow = await db
      .select({ updatedAt: contents.updatedAt })
      .from(contents)
      .where(eq(contents.cid, existing.cid))
      .get()

    let updatedAt = now
    if (input.updatedAt && input.updatedAt !== dbRow?.updatedAt) {
      // Manual override from frontmatter
      updatedAt = input.updatedAt
    }

    await db
      .update(contents)
      .set({
        updatedAt,
        ...(input.published !== undefined
          ? { published: input.published ? 1 : 0 }
          : {}),
      })
      .where(eq(contents.cid, existing.cid))

    await db
      .update(posts)
      .set({
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        tags: tagsJson,
        content: input.content,
        contentHash: input.contentHash,
      })
      .where(eq(posts.cid, existing.cid))

    return { cid: existing.cid, slug: input.slug, action: 'updated' }
  }

  // New post
  const cid = input.cid ?? newCid()
  const createdAt = input.createdAt ?? now
  const updatedAt = input.updatedAt ?? now

  await db.insert(contents).values({
    cid,
    type: 'post',
    createdAt,
    updatedAt,
    published: input.published ? 1 : 0,
  })

  await db.insert(posts).values({
    cid,
    slug: input.slug,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    tags: tagsJson,
    content: input.content,
    contentHash: input.contentHash,
  })

  return { cid, slug: input.slug, action: 'created' }
}

export interface PostStats {
  total: number
  published: number
  draft: number
}

export async function getPostStats(db: Db): Promise<PostStats> {
  const [row] = await db
    .select({
      total: count(),
      published: count(sql`CASE WHEN ${contents.published} = 1 THEN 1 END`),
    })
    .from(contents)
    .where(eq(contents.type, 'post'))
    .all()
  const total = row?.total ?? 0
  const published = row?.published ?? 0
  return { total, published, draft: total - published }
}

export interface RecentPost {
  cid: string
  slug: string
  title: string
  published: number
  updatedAt: string
}

export async function getRecentPosts(db: Db, limit = 5): Promise<RecentPost[]> {
  return db
    .select({
      cid: posts.cid,
      slug: posts.slug,
      title: posts.title,
      published: contents.published,
      updatedAt: contents.updatedAt,
    })
    .from(posts)
    .innerJoin(contents, eq(posts.cid, contents.cid))
    .orderBy(desc(contents.updatedAt))
    .limit(limit)
    .all()
}

/** Resolve a cid to its current slug and category (for redirect). */
export async function resolvePostSlugByCid(
  db: Db,
  cid: string,
): Promise<{ slug: string; category: string | null } | undefined> {
  return db
    .select({ slug: posts.slug, category: posts.category })
    .from(posts)
    .where(eq(posts.cid, cid))
    .get()
}

export interface OgPostMeta {
  title: string
  description: string | null
  category: string | null
  createdAt: string
}

export async function getPublishedPostMetaByCid(
  db: Db,
  cid: string,
): Promise<OgPostMeta | undefined> {
  return db
    .select({
      title: posts.title,
      description: posts.description,
      category: posts.category,
      createdAt: contents.createdAt,
    })
    .from(posts)
    .innerJoin(contents, eq(posts.cid, contents.cid))
    .where(and(eq(posts.cid, cid), eq(contents.published, 1)))
    .get()
}
