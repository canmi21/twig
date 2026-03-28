/* src/routes/api/auth/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '~/server/better-auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await getAuth().handler(request)
      },
      POST: async ({ request }: { request: Request }) => {
        return await getAuth().handler(request)
      },
    },
  },
})
