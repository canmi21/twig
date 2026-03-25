/* src/routes/api/object/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getBucket } from '~/server/platform'

export const Route = createFileRoute('/api/object/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
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
