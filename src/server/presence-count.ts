/* src/server/presence-count.ts */

/* src/server/presence-count.ts
 *
 * Server function for SSR presence count fetching.
 * Calls the PresenceDO's HTTP endpoint to get current counts
 * without establishing a WebSocket connection.
 */

import { createServerFn } from '@tanstack/react-start'
import { getAudience } from '~/server/platform'

export const getPresenceCount = createServerFn({ method: 'GET' })
  .inputValidator((input: { cid?: string }) => input)
  .handler(async ({ data }) => {
    try {
      const binding = getAudience()
      const id = binding.idFromName('global')
      const stub = binding.get(id)

      const url = new URL('https://do-internal/count')
      if (data.cid) url.searchParams.set('cid', data.cid)

      const res = await stub.fetch(url.toString())
      return (await res.json()) as { global: number; article: number }
    } catch {
      // DO may not be available in dev without wrangler
      return { global: 0, article: 0 }
    }
  })
