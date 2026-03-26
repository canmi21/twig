/* src/routes/feed/index.ts */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/feed/')({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 301,
          headers: { location: '/feed.xml' },
        }),
    },
  },
})
