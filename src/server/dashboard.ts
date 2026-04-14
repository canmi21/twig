/* src/server/dashboard.ts */

import { count } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getDb, getPresence } from './platform'
import { getAuth } from './better-auth'
import { user } from '~/lib/database/auth-schema'
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

interface DashboardOverview {
  postStats: PostStats
  commentStats: CommentStats
  recentPosts: RecentPost[]
  recentComments: CommentWithContext[]
  userCount: number
}

async function getUserCount(db: ReturnType<typeof getDb>): Promise<number> {
  // In dev without a real session, auth.api.listUsers fails.
  // Query the user table directly as a reliable fallback.
  if (import.meta.env.DEV) {
    const [row] = await db.select({ n: count() }).from(user).all()
    return row?.n ?? 0
  }

  const auth = getAuth()
  const headers = getRequestHeaders()
  const result = await auth.api.listUsers({
    headers,
    query: { limit: 1, sortBy: 'createdAt', sortDirection: 'desc' },
  })
  return (
    (result as unknown as { total?: number }).total ??
    (result as unknown as { users: unknown[] }).users.length
  )
}

export const fetchDashboardOverview = createServerFn().handler(
  async (): Promise<DashboardOverview> => {
    const db = getDb()

    const [postStats, commentStats, recentPosts, recentComments, userCount] =
      await Promise.all([
        getPostStats(db),
        getCommentStats(db),
        getRecentPosts(db),
        getRecentComments(db),
        getUserCount(db),
      ])

    return { postStats, commentStats, recentPosts, recentComments, userCount }
  },
)

export const fetchSidebarData = createServerFn().handler(async () => {
  const db = getDb()
  return { pendingComments: await getPendingCommentCount(db) }
})

export const resetPresenceSockets = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ closed: number }> => {
    const binding = getPresence()
    const id = binding.idFromName('global')
    const stub = binding.get(id)
    const res = await stub.fetch('https://do-internal/presence-reset', {
      method: 'POST',
    })
    return (await res.json()) as { closed: number }
  },
)
