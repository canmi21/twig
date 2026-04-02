/* src/routes/sitemap[.]xml.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getCache, getPublicUrl } from '~/server/platform'
import { readPostIndex } from '~/lib/storage/kv'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const publicUrl = getPublicUrl()
        const posts = await readPostIndex(getCache())
        const published = posts.filter((post) => post.published)

        const urls: string[] = [
          pageEntry(publicUrl, '/'),
          pageEntry(publicUrl, '/posts'),
          ...published.map((post) =>
            postEntry(
              publicUrl,
              `/posts/${post.category}/${post.slug}`,
              post.updatedAt,
            ),
          ),
        ]

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          '</urlset>',
        ].join('\n')

        return new Response(xml, {
          headers: { 'content-type': 'application/xml' },
        })
      },
    },
  },
})

function pageEntry(base: string, path: string): string {
  return `  <url>
    <loc>${base}${path}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`
}

function postEntry(base: string, path: string, lastmod: string): string {
  return `  <url>
    <loc>${base}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
}
