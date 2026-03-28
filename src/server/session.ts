/* src/server/session.ts */

import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getAuth } from './better-auth'

/** Get the current session, or null if not authenticated. */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(),
    })
    return session
  },
)

/** Get the current session, or throw if not authenticated. */
export const ensureSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(),
    })
    if (!session) throw new Error('Unauthorized')
    return session
  },
)
