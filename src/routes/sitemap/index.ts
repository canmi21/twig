/* src/routes/sitemap/index.ts */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sitemap/')({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 301,
          headers: { location: '/sitemap.xml' },
        }),
    },
  },
})
