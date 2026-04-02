/* src/routes/feed[.]xml.ts */

import { createFileRoute } from '@tanstack/react-router'
import { generateAtomFeed } from 'feedsmith'
import { getCache, getPublicUrl, getCdnUrl } from '~/server/platform'
import { readPostIndex, readPostKv } from '~/lib/storage/kv'
import { renderStaticHtml } from '~/lib/compiler/render-static-html'
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
          .filter((post) => post.published)
          .toSorted(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, FEED_LIMIT)

        const kvEntries = await Promise.all(
          recent.map((post) => readPostKv(kv, post.slug)),
        )

        const updated =
          recent.length > 0
            ? new Date(
                recent.reduce((latest, post) =>
                  post.updatedAt > latest.updatedAt ? post : latest,
                ).updatedAt,
              )
            : new Date()

        const entries = recent
          .map((post, i) => {
            const kvEntry = kvEntries[i]
            if (!kvEntry) return null

            const articleUrl = `${publicUrl}/posts/${post.category}/${post.slug}`
            const fullHtml = renderStaticHtml(
              kvEntry.html,
              kvEntry.components,
              { cdnPrefix, articleUrl },
            )

            return {
              id: articleUrl,
              title: post.title,
              updated: new Date(post.updatedAt),
              published: new Date(post.createdAt),
              summary: post.description,
              content: fullHtml,
              links: [{ href: articleUrl, rel: 'alternate' as const }],
            }
          })
          .filter((entry) => entry !== null)

        const xml = generateAtomFeed({
          id: publicUrl,
          title: SITE_TITLE,
          updated,
          links: [
            { href: publicUrl, rel: 'alternate' },
            { href: `${publicUrl}/feed.xml`, rel: 'self' },
          ],
          entries,
        })

        // feedsmith does not emit type="html" on <content>, patch it in
        const patched = xml.replaceAll('<content>', '<content type="html">')

        return new Response(patched, {
          headers: { 'content-type': 'application/atom+xml; charset=utf-8' },
        })
      },
    },
  },
})
