/* src/server/dashboard.ts */

import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getDb } from './platform'
import { getAuth } from './better-auth'
import {
  getPostStats,
  getRecentPosts,
  type PostStats,
  type RecentPost,
} from '~/lib/database/posts'
import {
  getCommentStats,
  getRecentComments,
  getPendingCommentCount,
  type CommentStats,
  type CommentWithContext,
} from '~/lib/database/comments'

export interface DashboardOverview {
  postStats: PostStats
  commentStats: CommentStats
  recentPosts: RecentPost[]
  recentComments: CommentWithContext[]
  userCount: number
}

export const fetchDashboardOverview = createServerFn().handler(
  async (): Promise<DashboardOverview> => {
    const db = getDb()
    const auth = getAuth()
    const headers = getRequestHeaders()

    const [postStats, commentStats, recentPosts, recentComments, usersResult] =
      await Promise.all([
        getPostStats(db),
        getCommentStats(db),
        getRecentPosts(db),
        getRecentComments(db),
        auth.api.listUsers({
          headers,
          query: { limit: 1, sortBy: 'createdAt', sortDirection: 'desc' },
        }),
      ])

    const userCount =
      (usersResult as unknown as { total?: number }).total ??
      (usersResult as unknown as { users: unknown[] }).users.length

    return { postStats, commentStats, recentPosts, recentComments, userCount }
  },
)

export const fetchSidebarData = createServerFn().handler(async () => {
  const db = getDb()
  return { pendingComments: await getPendingCommentCount(db) }
})
