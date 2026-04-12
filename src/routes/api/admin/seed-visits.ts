/* src/routes/api/admin/seed-visits.ts */

// One-time admin endpoint to seed the visit counter.
// Protected by CF Access (all /api/admin/* routes require auth).
// Remove after initial seeding if desired.

import { createFileRoute } from '@tanstack/react-router'
import { getPresence } from '~/server/platform'

export const Route = createFileRoute('/api/admin/seed-visits')({
  server: {
    handlers: {
      PUT: async ({ request }: { request: Request }) => {
        const { count } = (await request.json()) as { count: number }
        if (typeof count !== 'number' || count < 0) {
          return new Response('Invalid count', { status: 400 })
        }
        const binding = getPresence()
        const id = binding.idFromName('global')
        const stub = binding.get(id)
        const res = await stub.fetch('https://do-internal/visit', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ count }),
        })
        return res
      },
    },
  },
})
