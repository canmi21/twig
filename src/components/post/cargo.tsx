/* src/components/post/cargo.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { ArrowUpRight } from 'lucide-react'
import type { CrateInfo, CrateDepInfo } from '~/routes/api/crates/$.ts'

// --- Formatting ---

function fmtBytes(n: number): string {
  if (n >= 1_048_576)
    return `${(n / 1_048_576).toFixed(1).replace(/\.0$/, '')} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1).replace(/\.0$/, '')} KB`
  return `${n} B`
}

// --- Text fitting with pretext canvas ---

const LABEL_FONT = '500 11px sans-serif'
const SIZE_FONT = '9px sans-serif'

let _measureCtx: CanvasRenderingContext2D | null = null
function measureCtx(): CanvasRenderingContext2D {
  _measureCtx ??= document.createElement('canvas').getContext('2d')
  return _measureCtx as CanvasRenderingContext2D
}

function fitText(
  text: string,
  maxWidth: number,
  ctx: CanvasRenderingContext2D,
): string | null {
  if (ctx.measureText(text).width <= maxWidth) return text

  // Binary search for max chars that fit exactly
  let lo = 1
  let hi = text.length - 1
  let best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (ctx.measureText(text.slice(0, mid)).width <= maxWidth) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return best > 0 ? text.slice(0, best) : null
}

// --- Colors ---

// Random palette for per-crate coloring
const CRATE_PALETTE = [
  '#5B8DEF',
  '#E06C75',
  '#56B6C2',
  '#C678DD',
  '#D19A66',
  '#61AFEF',
  '#98C379',
  '#E5C07B',
  '#BE5046',
  '#7C6ede',
  '#3DA588',
  '#D4976C',
  '#6B93D6',
  '#C95B83',
  '#4DBFAD',
  '#B07BCC',
  '#D6956B',
  '#5E9FD1',
  '#C2704E',
  '#72B07B',
  '#9A8FCC',
  '#C4A057',
  '#6EAFC9',
  '#CC7A7A',
  '#4FAF8E',
]

function assignCrateColors(deps: CrateDepInfo[]): Map<string, string> {
  const colors = new Map<string, string>()
  let idx = 0
  for (const dep of deps) {
    if (!colors.has(dep.name)) {
      colors.set(dep.name, CRATE_PALETTE[idx % CRATE_PALETTE.length])
      idx++
    }
  }
  return colors
}

// Kind colors: tokei's 3 functional colors + green for build
const KIND_COLORS = {
  normal: '#3178c6',
  optional: '#7c6ede',
  dev: '#b0ada6',
  build: '#34D399',
} as const

function kindColor(dep: CrateDepInfo): string {
  if (dep.optional) return KIND_COLORS.optional
  return KIND_COLORS[dep.kind] ?? KIND_COLORS.normal
}

// --- Tooltip ---

function Tooltip({ x, y, dep }: { x: number; y: number; dep: CrateDepInfo }) {
  return (
    <div className="cs-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <div className="cs-tooltip__head">
        <span
          className="cs-tooltip__dot"
          style={{ backgroundColor: kindColor(dep) }}
        />
        <span className="cs-tooltip__title">{dep.name}</span>
        <span className="cs-tooltip__count">{dep.version}</span>
      </div>
      <div className="cs-tooltip__grid">
        <span className="cs-tooltip__label">Kind</span>
        <span className="cs-tooltip__val">
          {dep.kind}
          {dep.optional ? ' (optional)' : ''}
        </span>
        <span className="cs-tooltip__label">Size</span>
        <span className="cs-tooltip__val">
          {dep.crateSize != null ? fmtBytes(dep.crateSize) : 'unknown'}
        </span>
        <span className="cs-tooltip__label">Depth</span>
        <span className="cs-tooltip__val">
          {dep.depth === 0 ? 'direct' : `transitive (${dep.depth})`}
        </span>
        {dep.target && (
          <>
            <span className="cs-tooltip__label">Target</span>
            <span className="cs-tooltip__val">{dep.target}</span>
          </>
        )}
        {dep.featuresRequested.length > 0 && (
          <>
            <span className="cs-tooltip__label">Features</span>
            <span className="cs-tooltip__val">
              {dep.featuresRequested.length <= 3
                ? dep.featuresRequested.join(', ')
                : `${dep.featuresRequested.slice(0, 3).join(', ')} +${dep.featuresRequested.length - 3}`}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// --- Treemap View ---

function TreemapView({
  deps,
  crateColors,
}: {
  deps: CrateDepInfo[]
  crateColors: Map<string, string>
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{
    x: number
    y: number
    dep: CrateDepInfo
  } | null>(null)

  const sized = deps.filter((d) => d.crateSize && d.crateSize > 0)

  useEffect(() => {
    if (!ref.current || sized.length === 0) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const W = 700
    const H = 420
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    const root = d3
      .hierarchy({
        children: sized.map((d) => ({ ...d, value: d.crateSize ?? 0 })),
      } as Record<string, unknown>)
      .sum((d: Record<string, unknown>) => (d.value as number) || 0)
      // oxlint-disable-next-line no-array-sort -- d3 hierarchy requires in-place sort
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap().tile(d3.treemapBinary).size([W, H]).padding(2).round(true)(
      root as d3.HierarchyRectangularNode<unknown>,
    )

    for (const leaf of root.leaves()) {
      const node = leaf as d3.HierarchyRectangularNode<unknown>
      const d = node.data as CrateDepInfo & { value: number }
      const w = node.x1 - node.x0
      const h = node.y1 - node.y0
      const shorter = Math.min(w, h)
      const rx = Math.min(4, shorter * 0.3)
      const color = crateColors.get(d.name) ?? '#888'
      const g = svg.append('g')

      g.append('rect')
        .attr('x', node.x0)
        .attr('y', node.y0)
        .attr('width', w)
        .attr('height', h)
        .attr('fill', color)
        .attr('rx', rx)
        .attr('opacity', d.depth === 0 ? 0.88 : 0.65)
        .style('cursor', 'pointer')

      // Optional deps get dashed border
      if (d.optional && w > 6 && h > 6) {
        g.append('rect')
          .attr('x', node.x0 + 0.5)
          .attr('y', node.y0 + 0.5)
          .attr('width', w - 1)
          .attr('height', h - 1)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255,255,255,0.4)')
          .attr('stroke-dasharray', '3 2')
          .attr('rx', rx)
      }

      // Fit text with pretext measurement
      // Text layout: 4px top pad, 11px label line, 2px gap, 9px size line, 4px bottom
      const padX = 5
      const padY = 4
      const labelSize = 11
      const sizeSize = 9
      const lineGap = 2
      const labelY = padY + labelSize
      const sizeY = labelY + lineGap + sizeSize
      const availW = w - padX * 2

      if (availW > 4 && h >= labelY + padY) {
        const ctx = measureCtx()
        ctx.font = LABEL_FONT
        const label = fitText(d.name, availW, ctx)
        if (label) {
          g.append('text')
            .attr('x', node.x0 + padX)
            .attr('y', node.y0 + labelY)
            .text(label)
            .attr('fill', '#fff')
            .attr('font-size', `${labelSize}px`)
            .attr('font-weight', '500')
            .style('pointer-events', 'none')

          if (h >= sizeY + padY) {
            ctx.font = SIZE_FONT
            const sl = fitText(fmtBytes(d.crateSize ?? 0), availW, ctx)
            if (sl) {
              g.append('text')
                .attr('x', node.x0 + padX)
                .attr('y', node.y0 + sizeY)
                .text(sl)
                .attr('fill', 'rgba(255,255,255,0.7)')
                .attr('font-size', `${sizeSize}px`)
                .style('pointer-events', 'none')
            }
          }
        }
      }

      g.on('mouseenter', (ev) =>
        setTip({ x: ev.offsetX, y: ev.offsetY, dep: d }),
      ).on('mousemove', (ev) =>
        setTip({ x: ev.offsetX, y: ev.offsetY, dep: d }),
      )
    }

    // Clear tooltip when mouse leaves the SVG entirely
    svg.on('mouseleave', () => setTip(null))
  }, [sized, crateColors])

  if (sized.length === 0) {
    return <p className="cargo-empty">No dependency size data available.</p>
  }

  return (
    <div className="cargo-chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg ref={ref} width="100%" />
      {tip && <Tooltip x={tip.x} y={tip.y} dep={tip.dep} />}
    </div>
  )
}

// --- Table View ---

function TableView({
  deps,
  crateColors,
}: {
  deps: CrateDepInfo[]
  crateColors: Map<string, string>
}) {
  const sorted = deps.toSorted(
    (a, b) => (b.crateSize ?? 0) - (a.crateSize ?? 0),
  )
  return (
    <div className="cargo-table-wrap">
      <table className="cargo-table">
        <thead>
          <tr>
            <th className="cargo-table__th--left">Crate</th>
            <th>Version</th>
            <th>Kind</th>
            <th>Depth</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={`${d.name}-${d.kind}-${d.depth}`}>
              <td className="cargo-table__name-cell">
                <span
                  className="cargo-table__dot"
                  style={{ background: crateColors.get(d.name) ?? '#888' }}
                />
                {d.name}
                {d.optional && <span className="cargo-table__opt">opt</span>}
              </td>
              <td>{d.version}</td>
              <td>
                <span
                  className="cargo-table__kind-dot"
                  style={{ background: kindColor(d) }}
                />
                {d.kind}
              </td>
              <td>{d.depth === 0 ? 'direct' : d.depth}</td>
              <td>{d.crateSize != null ? fmtBytes(d.crateSize) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Main Widget ---

type ViewMode = 'treemap' | 'table'

export function CargoWidget({
  crate: crateName,
  version,
  view = 'treemap',
}: {
  crate: string
  version?: string
  view?: ViewMode
}) {
  const [data, setData] = useState<CrateInfo | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const url = version
      ? `/api/crates/${crateName}/${version}`
      : `/api/crates/${crateName}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json() as Promise<CrateInfo>
      })
      .then(setData)
      .catch(() => setError(true))
  }, [crateName, version])

  if (error) {
    return (
      <div className="cargo-widget cargo-widget--error">
        Failed to load crate info for{' '}
        <strong>
          {crateName}
          {version ? `@${version}` : ''}
        </strong>
      </div>
    )
  }

  if (!data) {
    return <div className="cargo-widget cargo-widget--loading" />
  }

  const crateColors = assignCrateColors(data.deps)
  const directCount = data.deps.filter((d) => d.depth === 0).length
  const transitiveCount = data.deps.length - directCount
  const featureCount = Object.keys(data.features).length

  return (
    <div className="cargo-widget">
      <div className="cargo-chart-area">
        {view === 'treemap' ? (
          <TreemapView deps={data.deps} crateColors={crateColors} />
        ) : (
          <TableView deps={data.deps} crateColors={crateColors} />
        )}
      </div>

      <div className="cargo-footer">
        <div className="cargo-legend">
          <span className="cargo-legend__item">
            <span
              className="cargo-legend__dot"
              style={{ background: KIND_COLORS.normal }}
            />
            Normal
          </span>
          <span className="cargo-legend__item">
            <span
              className="cargo-legend__dot"
              style={{ background: KIND_COLORS.optional }}
            />
            Optional
          </span>
          <span className="cargo-legend__item">
            <span
              className="cargo-legend__dot"
              style={{ background: KIND_COLORS.dev }}
            />
            Dev
          </span>
          <span className="cargo-legend__item">
            <span
              className="cargo-legend__dot"
              style={{ background: KIND_COLORS.build }}
            />
            Build
          </span>
        </div>
        <div className="cargo-footer__right">
          {featureCount > 0 && (
            <span className="cargo-footer__stat">
              <span className="cargo-footer__label">Features</span>{' '}
              <span className="cargo-footer__value">{featureCount}</span>
            </span>
          )}
          <span className="cargo-footer__stat">
            <span className="cargo-footer__label">Deps</span>{' '}
            <span className="cargo-footer__value">
              {directCount}+{transitiveCount}
            </span>
          </span>
          <span className="cargo-footer__stat">
            <span className="cargo-footer__label">Size</span>{' '}
            <span className="cargo-footer__value">
              {fmtBytes(data.totalDepSize)}
            </span>
          </span>
          <span className="cargo-footer__links">
            <a
              href={`https://crates.io/crates/${data.name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              crates.io
              <ArrowUpRight
                className="cargo-footer__link-icon"
                strokeWidth={2}
              />
            </a>
            <a
              href={`https://lib.rs/crates/${data.name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              lib.rs
              <ArrowUpRight
                className="cargo-footer__link-icon"
                strokeWidth={2}
              />
            </a>
            <a
              href={`https://docs.rs/${data.name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              docs.rs
              <ArrowUpRight
                className="cargo-footer__link-icon"
                strokeWidth={2}
              />
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}
