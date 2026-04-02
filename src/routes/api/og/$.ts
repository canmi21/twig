/* src/routes/api/og/$.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getCache } from '~/server/platform'
import { readPostKv } from '~/lib/storage/kv'

export const Route = createFileRoute('/api/og/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params._splat
        if (!slug) {
          return new Response('Not found', { status: 404 })
        }

        const post = await readPostKv(getCache(), slug)
        if (!post) {
          return new Response('Not found', { status: 404 })
        }

        // Lazy import to avoid loading WASM at Worker startup
        const { generateOgImage } = await import('~/server/og')
        const png = await generateOgImage(
          post.frontmatter.title,
          post.frontmatter.description,
          post.frontmatter.category,
          post.frontmatter.created_at,
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
