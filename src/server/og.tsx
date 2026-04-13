/* src/server/og.tsx */

import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'
import { SITE_TITLE } from '~/lib/content/metadata'

const FONT_CDN_URL =
  'https://cdn.jsdelivr.net/gh/lxgw/lxgwwenkai@5dea838/fonts/TTF/LXGWWenKai-Regular.ttf'

// Dev: fetch from Vite dev server (workerd can't reach external CDN through proxy).
// Requires `public/fonts/lxgw-wenkai-regular.ttf` — run `just setup-og-font`.
const FONT_LOCAL_PATH = '/fonts/lxgw-wenkai-regular.ttf'

let cachedFont: ArrayBuffer | null = null

async function fetchFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont

  const url = import.meta.env.DEV
    ? `http://localhost:26315${FONT_LOCAL_PATH}`
    : FONT_CDN_URL

  const font = await fetch(url).then((r) => r.arrayBuffer())
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
          maxWidth: 1056,
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
