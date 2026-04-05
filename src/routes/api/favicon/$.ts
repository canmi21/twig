/* src/routes/api/favicon/$.ts */

import { createFileRoute } from '@tanstack/react-router'

/** Half a year in seconds. */
const CACHE_MAX_AGE = 15_552_000

/** Priority order for favicon selection (higher index = higher priority). */
const FORMAT_PRIORITY: Record<string, number> = {
  ico: 1,
  png: 2,
  svg: 3,
}

interface FaviconCandidate {
  href: string
  priority: number
}

/**
 * Parse <link rel="icon"> tags from raw HTML and return candidates
 * sorted by priority (SVG > PNG 32x32 > ICO > fallback).
 */
function parseFaviconCandidates(
  html: string,
  baseUrl: string,
): FaviconCandidate[] {
  const candidates: FaviconCandidate[] = []
  const linkRegex = /<link\b[^>]*>/gi
  let match

  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0]

    // Must have rel containing "icon"
    const relMatch = tag.match(/rel\s*=\s*["']([^"']*)["']/i)
    if (!relMatch || !/\bicon\b/i.test(relMatch[1])) continue

    const hrefMatch = tag.match(/href\s*=\s*["']([^"']*)["']/i)
    if (!hrefMatch) continue

    const href = hrefMatch[1]
    const typeMatch = tag.match(/type\s*=\s*["']([^"']*)["']/i)
    const sizesMatch = tag.match(/sizes\s*=\s*["']([^"']*)["']/i)

    let priority = 0

    if (typeMatch?.[1]?.includes('svg') || href.endsWith('.svg')) {
      priority = FORMAT_PRIORITY.svg
    } else if (href.endsWith('.ico') || typeMatch?.[1]?.includes('x-icon')) {
      priority = FORMAT_PRIORITY.ico
    } else if (href.endsWith('.png') || typeMatch?.[1]?.includes('png')) {
      // Prefer 32x32 PNG over other sizes
      const is32 = sizesMatch?.[1]?.includes('32x32')
      priority = is32 ? FORMAT_PRIORITY.png + 0.5 : FORMAT_PRIORITY.png
    } else {
      priority = 0.5
    }

    try {
      const resolved = new URL(href, baseUrl).href
      candidates.push({ href: resolved, priority })
    } catch {
      // Skip malformed URLs
    }
  }

  return candidates.toSorted((a, b) => b.priority - a.priority)
}

export const Route = createFileRoute('/api/favicon/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const domain = params._splat
        if (!domain || !/^[\w.-]+\.\w{2,}$/.test(domain)) {
          return new Response('Invalid domain', { status: 400 })
        }

        const siteUrl = `https://${domain}`

        try {
          const pageRes = await fetch(siteUrl, {
            headers: {
              'user-agent': 'Mozilla/5.0 (compatible; FaviconProxy/1.0)',
            },
            redirect: 'follow',
          })

          if (!pageRes.ok) {
            return new Response('Failed to fetch site', { status: 502 })
          }

          const html = await pageRes.text()
          const candidates = parseFaviconCandidates(html, siteUrl)

          // Fallback to /favicon.ico if no <link> tags found
          const faviconUrl =
            candidates.length > 0
              ? candidates[0].href
              : `${siteUrl}/favicon.ico`

          const iconRes = await fetch(faviconUrl, { redirect: 'follow' })

          if (!iconRes.ok || !iconRes.body) {
            return new Response('Favicon not found', { status: 404 })
          }

          return new Response(iconRes.body, {
            headers: {
              'content-type':
                iconRes.headers.get('content-type') ?? 'image/x-icon',
              'cache-control': `public, max-age=${CACHE_MAX_AGE}`,
            },
          })
        } catch {
          // Network error — return 502 without cache headers
          return new Response('Failed to fetch favicon', { status: 502 })
        }
      },
    },
  },
})
