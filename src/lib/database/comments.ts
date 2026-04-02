/* src/lib/database/comments.ts */

import { eq, and, desc, asc, count, sql, inArray } from 'drizzle-orm'
import type { Db } from './index'
import { comments, posts } from './schema'
import { user } from './auth-schema'
import { newCid } from '../utils/uuid'

export interface CommentWithUser {
  id: string
  content: string
  status: string
  createdAt: string
  parentId: string | null
  userId: string
  userName: string
  userEmail: string
  userAgent: string
  location: string
}

export interface CommentWithContext extends CommentWithUser {
  postCid: string
  postTitle: string
  postSlug: string
}

export async function createComment(
  db: Db,
  input: {
    postCid: string
    userId: string
    content: string
    parentId?: string | null
    userAgent?: string
    location?: string
  },
): Promise<string> {
  const id = newCid()
  const now = new Date().toISOString()
  await db.insert(comments).values({
    id,
    postCid: input.postCid,
    userId: input.userId,
    content: input.content,
    parentId: input.parentId ?? null,
    status: 'pending',
    userAgent: input.userAgent ?? '',
    location: input.location ?? '',
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function getApprovedComments(
  db: Db,
  postCid: string,
): Promise<CommentWithUser[]> {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      userId: comments.userId,
      userName: user.name,
      userEmail: user.email,
      userAgent: comments.userAgent,
      location: comments.location,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(and(eq(comments.postCid, postCid), eq(comments.status, 'approved')))
    .orderBy(asc(comments.createdAt))
    .all()
}

export async function getPendingComments(
  db: Db,
): Promise<CommentWithContext[]> {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      userId: comments.userId,
      userName: user.name,
      userEmail: user.email,
      userAgent: comments.userAgent,
      location: comments.location,
      postCid: comments.postCid,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .innerJoin(posts, eq(comments.postCid, posts.cid))
    .where(eq(comments.status, 'pending'))
    .orderBy(desc(comments.createdAt))
    .all()
}

export async function getAllComments(db: Db): Promise<CommentWithContext[]> {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      userId: comments.userId,
      userName: user.name,
      userEmail: user.email,
      userAgent: comments.userAgent,
      location: comments.location,
      postCid: comments.postCid,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .innerJoin(posts, eq(comments.postCid, posts.cid))
    .orderBy(desc(comments.createdAt))
    .all()
}

export async function updateCommentStatus(
  db: Db,
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await db
    .update(comments)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(comments.id, id))
}

/** Delete a comment and all its descendants (cascade). */
export async function deleteComment(db: Db, id: string): Promise<void> {
  // Use recursive CTE to find all descendant IDs
  const rows = await db.all<{ id: string }>(
    sql`WITH RECURSIVE descendants(id) AS (
      VALUES (${id})
      UNION ALL
      SELECT c.id FROM comments c JOIN descendants d ON c.parent_id = d.id
    ) SELECT id FROM descendants`,
  )
  const ids = rows.map((row) => row.id)
  if (ids.length > 0) {
    await db.delete(comments).where(inArray(comments.id, ids))
  }
}

export interface CommentStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export async function getCommentStats(db: Db): Promise<CommentStats> {
  const [row] = await db
    .select({
      total: count(),
      pending: count(sql`CASE WHEN ${comments.status} = 'pending' THEN 1 END`),
      approved: count(
        sql`CASE WHEN ${comments.status} = 'approved' THEN 1 END`,
      ),
      rejected: count(
        sql`CASE WHEN ${comments.status} = 'rejected' THEN 1 END`,
      ),
    })
    .from(comments)
    .all()
  return {
    total: row?.total ?? 0,
    pending: row?.pending ?? 0,
    approved: row?.approved ?? 0,
    rejected: row?.rejected ?? 0,
  }
}

export async function getPendingCommentCount(db: Db): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(comments)
    .where(eq(comments.status, 'pending'))
    .all()
  return row?.n ?? 0
}

export async function getRecentComments(
  db: Db,
  limit = 5,
): Promise<CommentWithContext[]> {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      userId: comments.userId,
      userName: user.name,
      userEmail: user.email,
      userAgent: comments.userAgent,
      location: comments.location,
      postCid: comments.postCid,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .innerJoin(posts, eq(comments.postCid, posts.cid))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .all()
}
