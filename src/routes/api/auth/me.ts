/* src/routes/api/auth/me.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '~/server/better-auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth().api.getSession({
          headers: request.headers,
        })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }
        return new Response(
          JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            role: (session.user as { role?: string | null }).role ?? null,
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      },
    },
  },
})
