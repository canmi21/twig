/* src/routes/feed[.]xml.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getCache, getPublicUrl, getCdnUrl } from '~/server/platform'
import { readPostIndex, readPostKv } from '~/lib/storage/kv'
import { renderStaticHtml } from '~/lib/content/render-html'
import { SITE_TITLE } from '~/lib/content/metadata'

const FEED_LIMIT = 21

export const Route = createFileRoute('/feed.xml')({
  server: {
    handlers: {
      GET: async () => {
        const publicUrl = getPublicUrl()
        const cdnPrefix = getCdnUrl()
        const kv = getCache()

        const posts = await readPostIndex(kv)
        const recent = posts
          .filter((p) => p.published)
          .toSorted(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, FEED_LIMIT)

        const updated =
          recent.length > 0
            ? recent.reduce((latest, p) =>
                p.updatedAt > latest.updatedAt ? p : latest,
              ).updatedAt
            : new Date().toISOString()

        const kvEntries = await Promise.all(
          recent.map((p) => readPostKv(kv, p.slug)),
        )

        const entries: string[] = []
        for (let i = 0; i < recent.length; i++) {
          const post = recent[i]
          const kvEntry = kvEntries[i]
          if (!kvEntry) continue

          const articleUrl = `${publicUrl}/posts/${post.category}/${post.slug}`
          const fullHtml = renderStaticHtml(kvEntry.html, kvEntry.components, {
            cdnPrefix,
            articleUrl,
          })

          const parts = [
            '  <entry>',
            `    <title>${escapeXml(post.title)}</title>`,
            `    <link href="${articleUrl}" rel="alternate" />`,
            `    <id>${articleUrl}</id>`,
            `    <updated>${post.updatedAt}</updated>`,
            `    <published>${post.createdAt}</published>`,
          ]
          if (post.description) {
            parts.push(`    <summary>${escapeXml(post.description)}</summary>`)
          }
          parts.push(
            `    <content type="html">${escapeXml(fullHtml)}</content>`,
            '  </entry>',
          )
          entries.push(parts.join('\n'))
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<feed xmlns="http://www.w3.org/2005/Atom">',
          `  <title>${escapeXml(SITE_TITLE)}</title>`,
          `  <link href="${publicUrl}" rel="alternate" />`,
          `  <link href="${publicUrl}/feed.xml" rel="self" />`,
          `  <id>${publicUrl}</id>`,
          `  <updated>${updated}</updated>`,
          ...entries,
          '</feed>',
        ].join('\n')

        return new Response(xml, {
          headers: { 'content-type': 'application/atom+xml' },
        })
      },
    },
  },
})

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
