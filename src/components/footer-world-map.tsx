/* src/components/footer-world-map.tsx */

import { useEffect, useRef } from 'react'
import { sampleLand } from './footer-world-map-data'

// Grid dimensions tuned together: COLS/ROWS = 3 gives a 3:1 aspect, and
// LON_SPAN/LAT_SPAN = 3 keeps each tile square in geographic terms.
const COLS = 48
const ROWS = 16
const LON_SPAN = 90
const LAT_SPAN = 30
// Center latitude of the visible strip. 20°N covers a populated equatorial
// band (Sahel, Arabia, India, southeast Asia, Mexico) with mixed land/sea.
const LAT_CENTER = 20
const SPEED_DEG_PER_SEC = 0.5
// Tile visual: how much of its cell the tile fills, and corner radius as a
// fraction of the tile side.
const TILE_FILL_FRAC = 0.82
const TILE_RADIUS_FRAC = 0.28

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

export function FooterWorldMap({ className }: { className?: string }) {
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

    let offset = 0
    let lastT = performance.now()
    let rafId = 0

    const tick = (now: number) => {
      const dt = (now - lastT) / 1000
      lastT = now
      offset = (offset + SPEED_DEG_PER_SEC * dt) % 360

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

      const [dr, dg, db] = colors.dim
      const [lr, lg, lb] = colors.lit

      for (let row = 0; row < ROWS; row++) {
        const lat = LAT_CENTER + LAT_SPAN / 2 - (row + 0.5) * (LAT_SPAN / ROWS)
        for (let col = 0; col < COLS; col++) {
          const lon = offset + (col + 0.5) * (LON_SPAN / COLS) - 180
          const v = sampleLand(lon, lat)
          const r = Math.round(dr + (lr - dr) * v)
          const g = Math.round(dg + (lg - dg) * v)
          const b = Math.round(db + (lb - db) * v)
          ctx.fillStyle = `rgb(${r},${g},${b})`
          const x = col * cellW + xPad
          const y = row * cellH + yPad
          ctx.beginPath()
          ctx.roundRect(x, y, tileW, tileH, radius)
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
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
