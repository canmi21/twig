/* src/server/og.tsx */

import { ImageResponse } from 'workers-og'
import { SITE_TITLE } from '~/lib/content/metadata'

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/lxgw/lxgwwenkai@5dea838/fonts/TTF/LXGWWenKai-Regular.ttf'
const FONT_CACHE_PATH = 'node_modules/.cache/lxgw-wenkai-regular.ttf'

let cachedFont: ArrayBuffer | null = null

async function fetchFont(): Promise<ArrayBuffer> {
  if (cachedFont) {
    return cachedFont
  }

  // Dev mode: cache font to disk to avoid re-downloading on every restart.
  // workerd blocks node:fs, so disk cache must stay best-effort.
  if (import.meta.env.DEV) {
    try {
      const fs = await import('node:fs')
      const path = await import('node:path')
      if (fs.existsSync(FONT_CACHE_PATH)) {
        const buf = fs.readFileSync(FONT_CACHE_PATH)
        const font = buf.buffer.slice(
          buf.byteOffset,
          buf.byteOffset + buf.byteLength,
        ) as ArrayBuffer
        cachedFont = font
        return font
      }

      const ab = await fetch(FONT_URL).then((r) => r.arrayBuffer())
      try {
        fs.mkdirSync(path.dirname(FONT_CACHE_PATH), { recursive: true })
        fs.writeFileSync(FONT_CACHE_PATH, Buffer.from(ab))
      } catch {
        // Local cache write is optional.
      }
      cachedFont = ab
      return ab
    } catch {
      // workerd: fs not available, fall through to fetch-only mode
    }
  }

  const font = await fetch(FONT_URL).then((r) => r.arrayBuffer())
  cachedFont = font
  return font
}

function formatCreatedAt(createdAt?: string) {
  if (!createdAt) {
    return null
  }

  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export async function generateOgImageResponse(
  title: string,
  description?: string,
  category?: string,
  createdAt?: string,
): Promise<Response> {
  const font = await fetchFont()
  const createdAtLabel = formatCreatedAt(createdAt)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#ffffff',
        color: '#333333',
        padding: '56px 72px',
        fontFamily: 'LXGW WenKai',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 44,
          opacity: 0.34,
        }}
      >
        {SITE_TITLE}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            whiteSpace: 'pre-wrap',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              display: 'flex',
              fontSize: 38,
              opacity: 0.48,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'baseline',
          gap: 24,
        }}
      >
        {createdAtLabel ? (
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              opacity: 0.24,
            }}
          >
            {createdAtLabel}
          </div>
        ) : null}
        {category ? (
          <div
            style={{
              display: 'flex',
              fontSize: 36,
              opacity: 0.34,
            }}
          >
            {category}
          </div>
        ) : null}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'LXGW WenKai',
          data: font,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  )
}
