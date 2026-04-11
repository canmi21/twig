/* src/components/footer-world-map.tsx */

import { useEffect, useRef } from 'react'
import { sampleLand } from './footer-world-map-data'

// Grid dimensions copied from the last committed version.
const COLS = 48
const ROWS = 14
const LON_SPAN = 360
const LAT_SPAN = (ROWS / COLS) * LON_SPAN
// Exported so the route loader can precompute a wall-clock-aligned starting
// offset to send down with SSR. Both sides must use the same constant.
export const FOOTER_MAP_SPEED_DEG_PER_SEC = 1
const TILE_FILL_FRAC = 0.82
const TILE_RADIUS_FRAC = 0.28
const COLOR_SMOOTHING_SEC = 0.45

type RGB = [number, number, number]

function parseCssColor(cssColor: string): RGB {
  const tmp = document.createElement('span')
  tmp.style.color = cssColor
  tmp.style.display = 'none'
  document.body.appendChild(tmp)
  const rgb = getComputedStyle(tmp).color
  document.body.removeChild(tmp)
  const m = rgb.match(/[\d.]+/g)
  if (!m || m.length < 3) return [128, 128, 128]
  return [
    Number.parseFloat(m[0] ?? '0'),
    Number.parseFloat(m[1] ?? '0'),
    Number.parseFloat(m[2] ?? '0'),
  ]
}

interface FooterWorldMapProps {
  className?: string
  // Starting longitude offset in degrees, decided by the server at request
  // time so all clients loading at the same wall-clock moment see the same
  // slice. Client advances from here using local performance.now() delta.
  initialOffset: number
  latCenter: number
}

export function FooterWorldMap({
  className,
  initialOffset,
  latCenter,
}: FooterWorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const root = document.documentElement
    const colors = {
      dim: [0, 0, 0] as RGB,
      lit: [0, 0, 0] as RGB,
    }

    const refreshColors = () => {
      const styles = getComputedStyle(root)
      const dim = styles.getPropertyValue('--map-tile-dim').trim() || '#888'
      const lit = styles.getPropertyValue('--map-tile-lit').trim() || '#ccc'
      colors.dim = parseCssColor(dim)
      colors.lit = parseCssColor(lit)
    }
    refreshColors()

    // Theme toggle flips a class on <html>; re-read the palette when it does.
    const themeObserver = new MutationObserver(refreshColors)
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    })

    const setupSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    setupSize()
    const ro = new ResizeObserver(setupSize)
    ro.observe(canvas)

    const mountedAt = performance.now()
    let lastDrawAt = mountedAt
    const smoothed = new Float32Array(COLS * ROWS * 3)
    const initialized = new Uint8Array(COLS * ROWS)
    let rafId = 0

    const tick = (now: number) => {
      const elapsed = (now - mountedAt) / 1000
      const dt = Math.max(0, (now - lastDrawAt) / 1000)
      lastDrawAt = now
      const offset =
        (((initialOffset + elapsed * FOOTER_MAP_SPEED_DEG_PER_SEC) % 360) +
          360) %
        360
      const alpha =
        COLOR_SMOOTHING_SEC > 0 ? 1 - Math.exp(-dt / COLOR_SMOOTHING_SEC) : 1

      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      ctx.clearRect(0, 0, W, H)

      const cellW = W / COLS
      const cellH = H / ROWS
      const tileW = cellW * TILE_FILL_FRAC
      const tileH = cellH * TILE_FILL_FRAC
      const radius = Math.min(tileW, tileH) * TILE_RADIUS_FRAC
      const xPad = (cellW - tileW) / 2
      const yPad = (cellH - tileH) / 2
      const lonStep = LON_SPAN / COLS
      const [dr, dg, db] = colors.dim
      const [lr, lg, lb] = colors.lit

      for (let row = 0; row < ROWS; row++) {
        const lat = latCenter + LAT_SPAN / 2 - (row + 0.5) * (LAT_SPAN / ROWS)
        for (let col = 0; col < COLS; col++) {
          const lon = offset + (col + 0.5) * lonStep - 180
          const v = sampleLand(lon, lat)
          const r = Math.round(dr + (lr - dr) * v)
          const g = Math.round(dg + (lg - dg) * v)
          const b = Math.round(db + (lb - db) * v)
          const i = row * COLS + col
          const si = i * 3
          if (initialized[i] === 0) {
            smoothed[si] = r
            smoothed[si + 1] = g
            smoothed[si + 2] = b
            initialized[i] = 1
          } else {
            const sr = smoothed[si] ?? r
            const sg = smoothed[si + 1] ?? g
            const sb = smoothed[si + 2] ?? b
            smoothed[si] = sr + (r - sr) * alpha
            smoothed[si + 1] = sg + (g - sg) * alpha
            smoothed[si + 2] = sb + (b - sb) * alpha
          }
          const rr = Math.round(smoothed[si] ?? r)
          const gg = Math.round(smoothed[si + 1] ?? g)
          const bb = Math.round(smoothed[si + 2] ?? b)
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`
          ctx.beginPath()
          ctx.roundRect(
            col * cellW + xPad,
            row * cellH + yPad,
            tileW,
            tileH,
            radius,
          )
          ctx.fill()
        }
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      themeObserver.disconnect()
      ro.disconnect()
    }
  }, [initialOffset, latCenter])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
