/* src/lib/database/posts.ts */

import { and, eq, count, desc, sql } from 'drizzle-orm'
import type { Db } from './index'
import { contents, posts } from './schema'
import { newCid } from '../utils/uuid'

interface UpsertPostInput {
  slug: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  tweet?: string
  content: string
  contentHash: string
  cid?: string
  createdAt?: string
  updatedAt?: string
  published?: boolean
}

/** Metadata-only variant: omits content/contentHash so the content commit
 *  can be deferred to a separate step. See upsertPostMetadata below for
 *  the rationale. */
interface UpsertPostMetadataInput {
  slug: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  tweet?: string
  cid?: string
  createdAt?: string
}

interface UpsertPostResult {
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
  tweet: string | null
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
      tweet: posts.tweet,
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
      tweet: posts.tweet,
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

/**
 * Two-phase publish, phase A.
 *
 * Ensures a posts row exists for the given input and writes every
 * metadata field except `content` and `contentHash`. For new posts the
 * content columns are seeded with empty strings so the schema's
 * NOT NULL constraint is satisfied; existing posts keep their current
 * content untouched.
 *
 * `contents.updatedAt` is intentionally NOT bumped here — it is bumped
 * by `finalizePostContent` (phase B), which acts as the commit marker.
 * If a push run crashes between phase A and phase B, the next run will
 * see an unchanged updatedAt and a mismatched contentHash, and retry
 * this post from the top.
 */
export async function upsertPostMetadata(
  db: Db,
  input: UpsertPostMetadataInput,
): Promise<UpsertPostResult> {
  const now = new Date().toISOString()
  const tagsJson = input.tags ? JSON.stringify(input.tags) : null

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
    await db
      .update(posts)
      .set({
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        tags: tagsJson,
        tweet: input.tweet ?? null,
      })
      .where(eq(posts.cid, existing.cid))
    return { cid: existing.cid, slug: input.slug, action: 'updated' }
  }

  const cid = input.cid ?? newCid()
  const createdAt = input.createdAt ?? now
  // New rows start as unpublished, with empty content placeholders. The
  // commit phase flips these to their real values once compile + KV
  // write have succeeded.
  await db.insert(contents).values({
    cid,
    type: 'post',
    createdAt,
    updatedAt: createdAt,
    published: 0,
  })
  await db.insert(posts).values({
    cid,
    slug: input.slug,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    tags: tagsJson,
    tweet: input.tweet ?? null,
    content: '',
    contentHash: '',
  })
  return { cid, slug: input.slug, action: 'created' }
}

interface FinalizePostContentInput {
  cid: string
  content: string
  contentHash: string
  /** Optional frontmatter override; falls back to the existing row's
   *  updatedAt when no override is provided (so trivial re-pushes do
   *  not bump the timestamp on unchanged posts). */
  updatedAt?: string
  published?: boolean
}

/**
 * Two-phase publish, phase B. Writes the final content, content hash,
 * published flag, and updatedAt in the order that makes contentHash
 * the atomic commit marker. Callers must perform every fallible step
 * (media upload, compile, KV write) BEFORE invoking this function —
 * once contentHash is up to date the next diff run treats the post as
 * stable.
 */
export async function finalizePostContent(
  db: Db,
  input: FinalizePostContentInput,
): Promise<void> {
  const now = new Date().toISOString()

  const dbRow = await db
    .select({ updatedAt: contents.updatedAt })
    .from(contents)
    .where(eq(contents.cid, input.cid))
    .get()

  let updatedAt = now
  if (input.updatedAt && input.updatedAt !== dbRow?.updatedAt) {
    updatedAt = input.updatedAt
  }

  await db
    .update(posts)
    .set({ content: input.content, contentHash: input.contentHash })
    .where(eq(posts.cid, input.cid))

  await db
    .update(contents)
    .set({
      updatedAt,
      ...(input.published !== undefined
        ? { published: input.published ? 1 : 0 }
        : {}),
    })
    .where(eq(contents.cid, input.cid))
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
        tweet: input.tweet ?? null,
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
    tweet: input.tweet ?? null,
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

interface OgPostMeta {
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
