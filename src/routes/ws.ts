/* src/routes/ws.ts */

/* src/routes/ws.ts
 *
 * WebSocket upgrade endpoint. Forwards the upgrade request
 * to the global PresenceDO instance which manages all connections.
 */

import { createFileRoute } from '@tanstack/react-router'
import { getAudience } from '~/server/platform'

export const Route = createFileRoute('/ws')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const binding = getAudience()
        const id = binding.idFromName('global')
        const stub = binding.get(id)
        return stub.fetch(request)
      },
    },
  },
})
