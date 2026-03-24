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

  const existing = await db
    .select({ cid: posts.cid })
    .from(posts)
    .where(eq(posts.slug, input.slug))
    .get()

  if (existing) {
    await db
      .update(contents)
      .set({ updatedAt: now })
      .where(eq(contents.cid, existing.cid))

    await db
      .update(posts)
      .set({
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        tags: tagsJson,
        content: input.content,
      })
      .where(eq(posts.cid, existing.cid))

    return { cid: existing.cid, slug: input.slug, action: 'updated' }
  }

  const cid = newCid()

  await db.insert(contents).values({
    cid,
    type: 'post',
    createdAt: now,
    updatedAt: now,
    published: 0,
  })

  await db.insert(posts).values({
    cid,
    slug: input.slug,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    tags: tagsJson,
    content: input.content,
  })

  return { cid, slug: input.slug, action: 'created' }
}
