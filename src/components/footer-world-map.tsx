/* src/components/footer-world-map.tsx */

import { useEffect, useRef } from 'react'
import { sampleLand } from './footer-world-map-data'
import { geoToTileIndex } from '~/lib/geo-tile'

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
  initialOffset: number
  latCenter: number
  visitorLat?: number | null
  visitorLon?: number | null
  tileHeat?: Record<string, number>
}

export function FooterWorldMap({
  className,
  initialOffset,
  latCenter,
  visitorLat,
  visitorLon,
  tileHeat,
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
      marker: [0, 0, 0] as RGB,
      heat: [0, 0, 0] as RGB,
    }

    const refreshColors = () => {
      const styles = getComputedStyle(root)
      const dim = styles.getPropertyValue('--map-tile-dim').trim() || '#888'
      const lit = styles.getPropertyValue('--map-tile-lit').trim() || '#ccc'
      const marker =
        styles.getPropertyValue('--map-tile-marker').trim() || '#f97316'
      const heat =
        styles.getPropertyValue('--map-tile-heat').trim() || '#22c55e'
      colors.dim = parseCssColor(dim)
      colors.lit = parseCssColor(lit)
      colors.marker = parseCssColor(marker)
      colors.heat = parseCssColor(heat)
    }
    refreshColors()

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

    // Visitor rendered row (constant — lat band doesn't scroll).
    // Computed in the rendered grid's coordinate system so exactly one
    // tile matches, unlike geoToTileIndex which uses a coarser static grid.
    const visitorRow = (() => {
      if (visitorLat == null) return -1
      const latStep = LAT_SPAN / ROWS
      const r = Math.floor((latCenter + LAT_SPAN / 2 - visitorLat) / latStep)
      return r >= 0 && r < ROWS ? r : -1
    })()

    // Precompute heat normalization
    let maxLogCount = 0
    if (tileHeat) {
      const values = Object.values(tileHeat)
      if (values.length > 0) {
        maxLogCount = Math.log(1 + Math.max(...values))
      }
    }

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
      const [mr, mg, mb] = colors.marker
      const [hr, hg, hb] = colors.heat

      // Visitor rendered col (recomputed each frame — offset scrolls)
      let visitorCol = -1
      if (visitorLon != null && visitorRow >= 0) {
        const normLon = (((visitorLon + 180 - offset) % 360) + 360) % 360
        visitorCol = Math.floor(normLon / lonStep)
        if (visitorCol < 0 || visitorCol >= COLS) visitorCol = -1
      }

      for (let row = 0; row < ROWS; row++) {
        const lat = latCenter + LAT_SPAN / 2 - (row + 0.5) * (LAT_SPAN / ROWS)
        for (let col = 0; col < COLS; col++) {
          const lon = offset + (col + 0.5) * lonStep - 180
          const v = sampleLand(lon, lat)

          // Base color: dim → lit interpolation
          let r = dr + (lr - dr) * v
          let g = dg + (lg - dg) * v
          let b = db + (lb - db) * v

          // Static tile index for heat lookup
          const staticIdx = geoToTileIndex(lon, lat)

          // Heat map: blend toward green on land tiles with visits
          if (tileHeat && maxLogCount > 0 && v > 0) {
            const count = tileHeat[String(staticIdx)]
            if (count && count > 0) {
              const hf = (Math.log(1 + count) / maxLogCount) * v
              r += (hr - r) * hf
              g += (hg - g) * hf
              b += (hb - b) * hf
            }
          }

          // Visitor marker: override to orange (exactly one tile)
          if (row === visitorRow && col === visitorCol) {
            r = mr
            g = mg
            b = mb
          }

          // Exponential color smoothing
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
  }, [initialOffset, latCenter, visitorLat, visitorLon, tileHeat])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
