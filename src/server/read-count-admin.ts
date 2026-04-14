/* src/server/read-count-admin.ts */

/* Admin-only server functions for managing per-article read counts.
 * Talks to the presence DO's dedicated read-count endpoints without
 * going through the /count path (which would also increment).
 */

import { createServerFn } from '@tanstack/react-start'
import { getPresence } from '~/server/platform'
import { requireAdmin } from '~/server/admin-guard'

export const getAllReadCounts = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    try {
      const binding = getPresence()
      const stub = binding.get(binding.idFromName('global'))
      const res = await stub.fetch('https://do-internal/read-counts')
      return (await res.json()) as { counts: Record<string, number> }
    } catch {
      return { counts: {} }
    }
  },
)

export const setReadCount = createServerFn({ method: 'POST' })
  .inputValidator((input: { cid: string; reads: number }) => input)
  .handler(async ({ data }) => {
    await requireAdmin()
    const binding = getPresence()
    const stub = binding.get(binding.idFromName('global'))
    const url = new URL('https://do-internal/read-count')
    url.searchParams.set('cid', data.cid)
    const res = await stub.fetch(url.toString(), {
      method: 'PUT',
      body: JSON.stringify({ reads: data.reads }),
      headers: { 'content-type': 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`setReadCount failed: ${res.status}`)
    }
    return (await res.json()) as { reads: number }
  })
