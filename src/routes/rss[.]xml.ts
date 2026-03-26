/* src/routes/rss[.]xml.ts */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/rss.xml')({
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
