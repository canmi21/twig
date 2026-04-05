/* src/routes/api/favicon/$.ts */

import { createFileRoute } from '@tanstack/react-router'

type Tone = 'light' | 'dark'

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
  mediaTone?: Tone
}

function parseTone(value: string | null): Tone | undefined {
  if (value === 'light' || value === 'dark') {
    return value
  }

  return undefined
}

function parseIconRel(rel: string): boolean {
  return rel
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .includes('icon')
}

function parseMediaTone(media: string | undefined): Tone | undefined {
  if (!media) {
    return undefined
  }

  const match = media
    .match(/prefers-color-scheme\s*:\s*(light|dark)/i)?.[1]
    ?.toLowerCase()

  return match === 'light' || match === 'dark' ? match : undefined
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

    const relMatch = tag.match(/rel\s*=\s*["']([^"']*)["']/i)
    if (!relMatch || !parseIconRel(relMatch[1])) continue

    const hrefMatch = tag.match(/href\s*=\s*["']([^"']*)["']/i)
    if (!hrefMatch) continue

    const href = hrefMatch[1]
    const typeMatch = tag.match(/type\s*=\s*["']([^"']*)["']/i)
    const sizesMatch = tag.match(/sizes\s*=\s*["']([^"']*)["']/i)
    const mediaMatch = tag.match(/media\s*=\s*["']([^"']*)["']/i)

    let priority = 0

    if (typeMatch?.[1]?.includes('svg') || href.endsWith('.svg')) {
      priority = FORMAT_PRIORITY.svg
    } else if (href.endsWith('.ico') || typeMatch?.[1]?.includes('x-icon')) {
      priority = FORMAT_PRIORITY.ico
    } else if (href.endsWith('.png') || typeMatch?.[1]?.includes('png')) {
      const is32 = sizesMatch?.[1]?.includes('32x32')
      priority = is32 ? FORMAT_PRIORITY.png + 0.5 : FORMAT_PRIORITY.png
    } else {
      priority = 0.5
    }

    try {
      const resolved = new URL(href, baseUrl).href
      candidates.push({
        href: resolved,
        priority,
        mediaTone: parseMediaTone(mediaMatch?.[1]),
      })
    } catch {
      // Skip malformed URLs
    }
  }

  return candidates.toSorted((a, b) => b.priority - a.priority)
}

function selectFaviconCandidate(
  candidates: FaviconCandidate[],
  tone: Tone | undefined,
): FaviconCandidate | undefined {
  if (candidates.length === 0) {
    return undefined
  }

  if (!tone) {
    return candidates[0]
  }

  return (
    candidates.find((candidate) => candidate.mediaTone === tone) ??
    candidates.find((candidate) => candidate.mediaTone == null) ??
    candidates[0]
  )
}

function findMatchingBrace(input: string, startIndex: number): number {
  let depth = 0

  for (let i = startIndex; i < input.length; i++) {
    const char = input[i]
    if (char === '{') {
      depth += 1
      continue
    }

    if (char !== '}') {
      continue
    }

    depth -= 1
    if (depth === 0) {
      return i
    }
  }

  return -1
}

function simplifyAdaptiveCss(input: string, tone: Tone): string | null {
  const mediaRegex =
    /@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)\s*\{/gi

  let cursor = 0
  let changed = false
  let output = ''
  let match

  while ((match = mediaRegex.exec(input)) !== null) {
    const matchedTone = match[1]?.toLowerCase()
    const braceIndex = mediaRegex.lastIndex - 1
    const blockEnd = findMatchingBrace(input, braceIndex)
    if (blockEnd === -1) {
      continue
    }

    output += input.slice(cursor, match.index)

    const blockContent = input.slice(braceIndex + 1, blockEnd).trim()
    if (matchedTone === tone && blockContent.length > 0) {
      output += blockContent
    }

    changed = true
    cursor = blockEnd + 1
    mediaRegex.lastIndex = blockEnd + 1
  }

  if (!changed) {
    return null
  }

  output += input.slice(cursor)
  return output
}

function simplifyAdaptiveSvg(svg: string, tone: Tone): string | null {
  const styleRegex = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi
  let changed = false

  const nextSvg = svg.replace(styleRegex, (fullMatch, attrs, cssContent) => {
    const simplified = simplifyAdaptiveCss(cssContent, tone)
    if (simplified == null) {
      return fullMatch
    }

    changed = true
    return `<style${attrs}>${simplified}</style>`
  })

  return changed ? nextSvg : null
}

function isSvgResponse(url: string, contentType: string | null): boolean {
  return (
    contentType?.includes('image/svg+xml') === true ||
    url.toLowerCase().endsWith('.svg')
  )
}

async function buildFaviconResponse(
  iconRes: Response,
  iconUrl: string,
  tone: Tone | undefined,
): Promise<Response> {
  const contentType = iconRes.headers.get('content-type')

  if (!tone || !isSvgResponse(iconUrl, contentType)) {
    if (!iconRes.body) {
      return new Response('Favicon not found', { status: 404 })
    }

    return new Response(iconRes.body, {
      headers: {
        'content-type': contentType ?? 'image/x-icon',
        'cache-control': `public, max-age=${CACHE_MAX_AGE}`,
      },
    })
  }

  const svg = await iconRes.text()
  const simplified = simplifyAdaptiveSvg(svg, tone) ?? svg

  return new Response(simplified, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_MAX_AGE}`,
    },
  })
}

export const Route = createFileRoute('/api/favicon/$')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const domain = params._splat
        if (!domain || !/^[\w.-]+\.\w{2,}$/.test(domain)) {
          return new Response('Invalid domain', { status: 400 })
        }

        const tone = parseTone(new URL(request.url).searchParams.get('tone'))
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
          const faviconUrl =
            selectFaviconCandidate(candidates, tone)?.href ??
            `${siteUrl}/favicon.ico`

          const iconRes = await fetch(faviconUrl, { redirect: 'follow' })
          if (!iconRes.ok) {
            return new Response('Favicon not found', { status: 404 })
          }

          return await buildFaviconResponse(iconRes, faviconUrl, tone)
        } catch {
          return new Response('Failed to fetch favicon', { status: 502 })
        }
      },
    },
  },
})
