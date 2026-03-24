/* src/lib/database/posts.ts */

import { eq } from 'drizzle-orm'
import type { Db } from './index'
import { contents, posts } from './schema'
import { newCid } from './uuid'

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
