/* src/server/dashboard.ts */

import { count, max } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb, getPresence } from './platform'
import { requireAdmin } from './admin-guard'
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
  // Count the user table directly instead of round-tripping through
  // Better Auth's admin plugin. The plugin reads the session from
  // incoming request headers, which on the first SSR request after a
  // fresh login does not yet carry the new cookie — calling through it
  // would throw here even though requireAdmin has already passed. The
  // user table is the admin plugin's source of truth anyway, so a
  // direct count yields the same number without the round-trip or the
  // `as unknown as` cast the plugin response forced.
  const [row] = await db.select({ n: count() }).from(user).all()
  return row?.n ?? 0
}

export const fetchDashboardOverview = createServerFn().handler(
  async (): Promise<DashboardOverview> => {
    await requireAdmin()
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
  await requireAdmin()
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
    await requireAdmin()
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
    await requireAdmin()
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

/**
 * Fetch a DO snapshot and mirror it into the do_backup table as a single
 * atomic overwrite. Delete + insert are wrapped in db.batch() so a partial
 * failure cannot leave the backup half-erased — either the new snapshot
 * fully replaces the old rows, or the old rows stay intact.
 *
 * Not exposed as a server function: `backupDoToD1` wraps this with the
 * admin guard, and `wipeDo` reuses it internally to guarantee every wipe
 * is preceded by a fresh snapshot.
 */
async function captureDoSnapshot(
  db: ReturnType<typeof getDb>,
): Promise<{ count: number; updatedAt: string }> {
  const res = await getActorStub().fetch('https://do-internal/snapshot')
  const { entries } = (await res.json()) as { entries: BackupEntry[] }

  const updatedAt = new Date().toISOString()

  if (entries.length > 0) {
    await db.batch([
      db.delete(doBackup),
      db.insert(doBackup).values(
        entries.map((entry) => ({
          key: entry.key,
          value: JSON.stringify(entry.value),
          updatedAt,
        })),
      ),
    ])
  } else {
    await db.delete(doBackup).run()
  }

  return { count: entries.length, updatedAt }
}

export const backupDoToD1 = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ count: number; updatedAt: string }> => {
    await requireAdmin()
    return captureDoSnapshot(getDb())
  },
)

export const restoreDoFromD1 = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ restored: number }> => {
    await requireAdmin()
    const db = getDb()
    const rows = await db.select().from(doBackup).all()
    if (rows.length === 0) return { restored: 0 }

    // Parse each row defensively: a corrupt single row should not abort
    // the entire restore. Skipped rows are logged so the operator can
    // inspect them in D1.
    const entries: BackupEntry[] = []
    for (const row of rows) {
      try {
        entries.push({ key: row.key, value: JSON.parse(row.value) })
      } catch (error) {
        // oxlint-disable-next-line no-console -- surface corruption in Wrangler logs
        console.warn(
          `[dashboard] skipping corrupt do_backup row "${row.key}":`,
          error,
        )
      }
    }

    const res = await getActorStub().fetch('https://do-internal/restore', {
      method: 'POST',
      body: JSON.stringify({ entries }),
      headers: { 'content-type': 'application/json' },
    })
    return (await res.json()) as { restored: number }
  },
)

/**
 * Wipe all persistent DO state. Always takes a fresh snapshot into
 * do_backup first — the snapshot must succeed before the wipe is issued.
 * If capturing the snapshot throws, the wipe is aborted and DO state is
 * untouched, so the caller can safely retry or investigate.
 */
export const wipeDo = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ wiped: true; backupCount: number }> => {
    await requireAdmin()
    const snapshot = await captureDoSnapshot(getDb())
    const res = await getActorStub().fetch('https://do-internal/wipe', {
      method: 'POST',
    })
    const body = (await res.json()) as { wiped: true }
    return { ...body, backupCount: snapshot.count }
  },
)
