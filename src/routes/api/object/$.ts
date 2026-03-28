/* src/routes/api/object/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getBucket } from '~/server/platform'

export const Route = createFileRoute('/api/object/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Dev-only proxy for local R2; production uses CDN_PUBLIC_URL directly.
        if (!import.meta.env.DEV) {
          return new Response('Not found', { status: 404 })
        }

        const key = params._splat
        if (!key) {
          return new Response('Not found', { status: 404 })
        }

        const object = await getBucket().get(key)

        if (!object) {
          return new Response('Not found', { status: 404 })
        }

        return new Response(object.body, {
          headers: {
            'content-type':
              object.httpMetadata?.contentType ?? 'application/octet-stream',
            'content-length': String(object.size),
          },
        })
      },
    },
  },
})
