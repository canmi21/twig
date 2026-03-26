/* src/routes/rss/index.ts */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/rss/')({
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
