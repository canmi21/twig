/* src/server/admin-guard.ts */

import { getRequestHeaders } from '@tanstack/react-start/server'
import { getAuth } from './better-auth'

/**
 * Guard for server functions that must only run for signed-in admins.
 * Reads the Better Auth session from request cookies and verifies that
 * the user's role is `admin`. Throws on failure so the caller (or the
 * global error boundary) surfaces a 401/403 instead of leaking a stack
 * trace.
 *
 * The admin role is assigned by `databaseHooks.user.create.before` in
 * src/server/better-auth.ts — the owner email and the first registered
 * user are bootstrapped as admins.
 */
export async function requireAdmin(): Promise<{
  userId: string
  email: string
}> {
  const session = await getAuth().api.getSession({
    headers: getRequestHeaders(),
  })
  if (!session) {
    throw new Error('Unauthorized')
  }
  const role = (session.user as { role?: string | null }).role
  if (role !== 'admin') {
    throw new Error('Forbidden')
  }
  return { userId: session.user.id, email: session.user.email }
}
