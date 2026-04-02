/* src/routes/api/og/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getPublishedPostMetaByCid } from '~/lib/database/posts'
import { getDb } from '~/server/platform'

export const Route = createFileRoute('/api/og/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cid = params._splat
        if (!cid) {
          return new Response('Not found', { status: 404 })
        }

        const post = await getPublishedPostMetaByCid(getDb(), cid)
        if (!post) {
          return new Response('Not found', { status: 404 })
        }

        // Lazy import to avoid loading WASM at Worker startup
        const { generateOgImageResponse } = await import('~/server/og')
        const response = await generateOgImageResponse(
          post.title,
          post.description ?? undefined,
          post.category ?? undefined,
          post.createdAt,
        )
        const headers = new Headers(response.headers)
        headers.set('cache-control', 'public, max-age=604800, immutable')
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      },
    },
  },
})
