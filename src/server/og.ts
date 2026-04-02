/* src/server/og.ts */

import satori, { init } from 'satori/standalone'
import { Resvg, initResvg, resvgWasmModule } from '@cf-wasm/resvg'
// @ts-expect-error static wasm import — returns WebAssembly.Module on workerd
import yogaWasm from 'satori/yoga.wasm'
import { SITE_TITLE } from '~/lib/content/metadata'

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/lxgw/lxgwwenkai@5dea838/fonts/TTF/LXGWWenKai-Regular.ttf'
const FONT_CACHE_PATH = 'node_modules/.cache/lxgw-wenkai-regular.ttf'

let initialized = false
let cachedFont: ArrayBuffer | null = null

async function loadYogaWasm(): Promise<ArrayBuffer | WebAssembly.Module> {
  if (typeof yogaWasm !== 'string') {
    return yogaWasm as WebAssembly.Module
  }

  const fs = await import('node:fs/promises')
  const buf = await fs.readFile(yogaWasm)
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer
}

async function fetchFont(): Promise<ArrayBuffer> {
  // Dev mode: cache font to disk to avoid re-downloading on every restart.
  // workerd blocks node:fs, so disk cache must stay best-effort.
  if (import.meta.env.DEV) {
    try {
      const fs = await import('node:fs')
      const path = await import('node:path')
      if (fs.existsSync(FONT_CACHE_PATH)) {
        const buf = fs.readFileSync(FONT_CACHE_PATH)
        return buf.buffer.slice(
          buf.byteOffset,
          buf.byteOffset + buf.byteLength,
        ) as ArrayBuffer
      }
      const ab = await fetch(FONT_URL).then((r) => r.arrayBuffer())
      try {
        fs.mkdirSync(path.dirname(FONT_CACHE_PATH), { recursive: true })
        fs.writeFileSync(FONT_CACHE_PATH, Buffer.from(ab))
      } catch {
        // Local cache write is optional.
      }
      return ab
    } catch {
      // workerd: fs not available, fall through to fetch-only mode
    }
  }
  return fetch(FONT_URL).then((r) => r.arrayBuffer())
}

async function ensureInit() {
  if (initialized) return
  const fontPromise = fetchFont()
  const yogaWasmInput = loadYogaWasm()
  try {
    await init(await yogaWasmInput)
  } catch {
    // Already initialized (HMR)
  }
  try {
    await initResvg(resvgWasmModule)
  } catch {
    // Already initialized (HMR)
  }
  cachedFont = await fontPromise
  initialized = true
}

export async function generateOgImage(
  title: string,
  description?: string,
  category?: string,
  createdAt?: string,
): Promise<Uint8Array> {
  await ensureInit()

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          fontFamily: 'LXGW WenKai',
          padding: '56px 72px',
        },
        children: [
          // Top-left: site name
          {
            type: 'div',
            props: {
              style: {
                fontSize: '44px',
                color: '#333333',
                opacity: 0.34,
              },
              children: SITE_TITLE,
            },
          },
          // Center: title + description
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxWidth: '1000px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '96px',
                      fontWeight: 400,
                      color: '#333333',
                      lineHeight: 1.15,
                      letterSpacing: '-0.03em',
                    },
                    children: title,
                  },
                },
                ...(description
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '38px',
                            color: '#333333',
                            opacity: 0.48,
                            lineHeight: 1.4,
                          },
                          children: description,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
          // Bottom-right: category + date (left-bottom clear for Twitter overlay)
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'baseline',
                gap: '24px',
              },
              children: [
                ...(createdAt
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '30px',
                            color: '#333333',
                            opacity: 0.24,
                          },
                          children: new Date(createdAt).toLocaleDateString(
                            'en-US',
                            { year: 'numeric', month: 'short', day: 'numeric' },
                          ),
                        },
                      },
                    ]
                  : []),
                ...(category
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '36px',
                            color: '#333333',
                            opacity: 0.34,
                          },
                          children: category,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
        ],
      },
    } as React.ReactNode,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'LXGW WenKai',
          data: cachedFont as ArrayBuffer,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  )

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
  return resvg.render().asPng()
}
