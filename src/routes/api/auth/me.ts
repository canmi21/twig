/* src/routes/api/auth/me.ts */

import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/server/auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const result = await requireAuth(request)
        if (result instanceof Response) return result

        return new Response(JSON.stringify(result), {
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  },
})
