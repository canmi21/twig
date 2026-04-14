/* src/server/admin-guard.ts */

import { eq } from 'drizzle-orm'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getAuth } from './better-auth'
import { getDb } from './platform'
import { user } from '~/lib/database/auth-schema'

const DEV_SEED_ADMIN_EMAIL = 'admin@dev.local'

/**
 * Guard for server functions that must only run for signed-in admins.
 * Reads the Better Auth session from request cookies and verifies that
 * the user's role is `admin`. Throws on failure so the caller (or the
 * global error boundary) surfaces a 401/403 instead of leaking a stack
 * trace.
 *
 * The admin role is assigned by `databaseHooks.user.create.before` in
 * src/server/better-auth.ts — the owner email, the dev seed email, and
 * the first registered user are bootstrapped as admins.
 *
 * Dev fallback: on the first SSR request after a cold start, the
 * dashboard layout's `checkAuth` runs an auto-login flow that writes a
 * session cookie onto the response. That cookie is not visible to
 * `getSession` calls made later in the same request (incoming headers
 * are immutable), so any server function invoked inline by a route
 * loader would otherwise throw here even though the user IS the dev
 * admin. To keep the post-sync-remote workflow usable, fall back to a
 * direct DB lookup of the seed admin row when there is no session.
 * Prod always requires a real cookie session.
 */
export async function requireAdmin(): Promise<{
  userId: string
  email: string
}> {
  const session = await getAuth().api.getSession({
    headers: getRequestHeaders(),
  })

  if (session) {
    const role = (session.user as { role?: string | null }).role
    if (role !== 'admin') {
      throw new Error('Forbidden')
    }
    return { userId: session.user.id, email: session.user.email }
  }

  if (import.meta.env.DEV) {
    const db = getDb()
    const row = await db
      .select({ id: user.id, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.email, DEV_SEED_ADMIN_EMAIL))
      .get()
    if (row && row.role === 'admin') {
      return { userId: row.id, email: row.email }
    }
  }

  throw new Error('Unauthorized')
}
