/* src/routes/api/object/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getEnv } from '~/server/env'

export const Route = createFileRoute('/api/object/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat
        if (!key) {
          return new Response('Not found', { status: 404 })
        }

        const { taki_bucket } = getEnv()
        const object = await taki_bucket.get(key)

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
