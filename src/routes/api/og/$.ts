/* src/routes/api/og/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getPublishedPostMetaBySlug } from '~/lib/database/posts'
import { getDb } from '~/server/platform'

export const Route = createFileRoute('/api/og/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params._splat
        if (!slug) {
          return new Response('Not found', { status: 404 })
        }

        const post = await getPublishedPostMetaBySlug(getDb(), slug)
        if (!post) {
          return new Response('Not found', { status: 404 })
        }

        // Lazy import to avoid loading WASM at Worker startup
        const { generateOgImage } = await import('~/server/og')
        const png = await generateOgImage(
          post.title,
          post.description ?? undefined,
          post.category ?? undefined,
          post.createdAt,
        )

        return new Response(png.buffer as ArrayBuffer, {
          headers: {
            'content-type': 'image/png',
            'cache-control': 'public, max-age=604800, immutable',
          },
        })
      },
    },
  },
})
