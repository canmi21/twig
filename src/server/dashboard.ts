/* src/server/dashboard.ts */

import { count, max } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getDb, getPresence } from './platform'
import { getAuth } from './better-auth'
import { user } from '~/lib/database/auth-schema'
import { doBackup } from '~/lib/database/schema'
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

function getActorStub() {
  const binding = getPresence()
  const id = binding.idFromName('global')
  return binding.get(id)
}

export const resetPresenceSockets = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ closed: number }> => {
    const res = await getActorStub().fetch(
      'https://do-internal/presence-reset',
      { method: 'POST' },
    )
    return (await res.json()) as { closed: number }
  },
)

interface BackupStatus {
  count: number
  updatedAt: string | null
}

export const fetchBackupStatus = createServerFn().handler(
  async (): Promise<BackupStatus> => {
    const db = getDb()
    const [row] = await db
      .select({
        n: count(),
        latest: max(doBackup.updatedAt),
      })
      .from(doBackup)
      .all()
    return {
      count: row?.n ?? 0,
      updatedAt: row?.latest ?? null,
    }
  },
)

interface BackupEntry {
  key: string
  value: unknown
}

export const backupDoToD1 = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ count: number; updatedAt: string }> => {
    const res = await getActorStub().fetch('https://do-internal/snapshot')
    const { entries } = (await res.json()) as { entries: BackupEntry[] }

    const db = getDb()
    const updatedAt = new Date().toISOString()

    // Atomic overwrite: clear existing rows and re-insert the snapshot.
    // The do_backup table is a single-snapshot mirror, not a history log.
    await db.delete(doBackup).run()
    if (entries.length > 0) {
      await db
        .insert(doBackup)
        .values(
          entries.map((entry) => ({
            key: entry.key,
            value: JSON.stringify(entry.value),
            updatedAt,
          })),
        )
        .run()
    }

    return { count: entries.length, updatedAt }
  },
)

export const restoreDoFromD1 = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ restored: number }> => {
    const db = getDb()
    const rows = await db.select().from(doBackup).all()
    if (rows.length === 0) return { restored: 0 }

    const entries: BackupEntry[] = rows.map((row) => ({
      key: row.key,
      value: JSON.parse(row.value) as unknown,
    }))

    const res = await getActorStub().fetch('https://do-internal/restore', {
      method: 'POST',
      body: JSON.stringify({ entries }),
      headers: { 'content-type': 'application/json' },
    })
    return (await res.json()) as { restored: number }
  },
)

export const wipeDo = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ wiped: true }> => {
    const res = await getActorStub().fetch('https://do-internal/wipe', {
      method: 'POST',
    })
    return (await res.json()) as { wiped: true }
  },
)
