/* src/server/comments.ts */

import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getDb } from './platform'
import { getAuth } from './better-auth'
import { notifyNewComment, notifyCommentReply } from './notify'
import {
  createComment,
  getApprovedComments,
  getPendingComments,
  getAllComments,
  updateCommentStatus,
  deleteComment,
} from '~/lib/database/comments'
import { comments, posts } from '~/lib/database/schema'
import { user } from '~/lib/database/auth-schema'

const MAX_COMMENT_LENGTH = 2000

export const fetchComments = createServerFn()
  .inputValidator((input: { postCid: string }) => input)
  .handler(async ({ data }) => {
    return getApprovedComments(getDb(), data.postCid)
  })

export const submitComment = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { postCid: string; content: string; parentId?: string }) => input,
  )
  .handler(async ({ data }) => {
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(),
    })
    if (!session) throw new Error('Unauthorized')

    const content = data.content.trim()
    if (!content) throw new Error('Comment cannot be empty')
    if (content.length > MAX_COMMENT_LENGTH) {
      throw new Error(`Comment exceeds ${MAX_COMMENT_LENGTH} characters`)
    }

    const db = getDb()
    const post = await db
      .select({
        cid: posts.cid,
        title: posts.title,
        slug: posts.slug,
        category: posts.category,
      })
      .from(posts)
      .where(eq(posts.cid, data.postCid))
      .get()
    if (!post) throw new Error('Post not found')

    // Validate parent comment exists and belongs to the same post
    let parentComment: {
      userId: string
      postCid: string
    } | null = null
    if (data.parentId) {
      const parent = await db
        .select({
          userId: comments.userId,
          postCid: comments.postCid,
        })
        .from(comments)
        .where(eq(comments.id, data.parentId))
        .get()
      if (!parent) throw new Error('Parent comment not found')
      if (parent.postCid !== data.postCid) {
        throw new Error('Parent comment belongs to a different post')
      }
      parentComment = parent
    }

    await createComment(db, {
      postCid: data.postCid,
      userId: session.user.id,
      content,
      parentId: data.parentId ?? null,
    })

    // Notify site owner
    try {
      await notifyNewComment({
        postTitle: post.title,
        postSlug: post.slug,
        postCategory: post.category,
        userName: session.user.name,
        userEmail: session.user.email,
        content,
      })
    } catch {
      // Notification failure should not block comment creation
    }

    // Notify parent comment author (if replying and not replying to self)
    if (parentComment && parentComment.userId !== session.user.id) {
      try {
        const parentUser = await db
          .select({ name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, parentComment.userId))
          .get()
        if (parentUser) {
          await notifyCommentReply({
            postTitle: post.title,
            postSlug: post.slug,
            postCategory: post.category,
            parentUserName: parentUser.name,
            parentUserEmail: parentUser.email,
            replyUserName: session.user.name,
            replyContent: content,
          })
        }
      } catch {
        // Reply notification failure should not block comment creation
      }
    }
  })

export const fetchPendingComments = createServerFn().handler(async () => {
  return getPendingComments(getDb())
})

export const fetchAllComments = createServerFn().handler(async () => {
  return getAllComments(getDb())
})

export const approveComment = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await updateCommentStatus(getDb(), data.id, 'approved')
  })

export const rejectComment = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await updateCommentStatus(getDb(), data.id, 'rejected')
  })

export const removeComment = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await deleteComment(getDb(), data.id)
  })
