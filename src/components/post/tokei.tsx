/* src/components/post/tokei.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useMemo, useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { ArrowUpRight } from 'lucide-react'

// --- Types ---

interface NestedLang {
  lang: string
  lines: number
  code: number
  comments: number
  blanks: number
}

interface LangStat {
  lang: string
  files: number
  lines: number
  code: number
  comments: number
  blanks: number
  nested: NestedLang[] | null
}

// --- Colors ---

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  Go: '#00add8',
  Python: '#3572a5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4f5d95',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  Scala: '#c22d40',
  Haskell: '#5e5086',
  Lua: '#000080',
  Perl: '#0298c3',
  R: '#198ce7',
  Shell: '#89e051',
  Bash: '#89e051',
  BASH: '#89e051',
  PowerShell: '#012456',
  SQL: '#e38c00',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  TSX: '#3178c6',
  JSX: '#f1e05a',
  JSON: '#a0a0a0',
  YAML: '#cb171e',
  TOML: '#9c4221',
  XML: '#0060ac',
  Markdown: '#083fa1',
  Makefile: '#427819',
  Dockerfile: '#384d54',
  Nix: '#7e7eff',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  OCaml: '#3be133',
  Julia: '#a270ba',
  SVG: '#5f5e5a',
  Just: '#534ab7',
}

const FALLBACK_POOL = [
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#e11d48',
  '#0891b2',
  '#a855f7',
]

const assignedFallbacks = new Map<string, string>()
let fallbackIdx = 0

function getLangColor(lang: string): string {
  if (LANG_COLORS[lang]) return LANG_COLORS[lang]
  const cached = assignedFallbacks.get(lang)
  if (cached) return cached
  const color = FALLBACK_POOL[fallbackIdx % FALLBACK_POOL.length]
  fallbackIdx++
  assignedFallbacks.set(lang, color)
  return color
}

const FUNC_COLORS = {
  code: '#3178c6',
  comments: '#7c6ede',
  blanks: '#b0ada6',
} as const

// --- Text fitting ---

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

// --- Formatting ---

function fmt(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toString()
}

function fmtFull(n: number): string {
  return n.toLocaleString()
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

// --- Parser ---

function parseTokei(raw: string): LangStat[] {
  const lines = raw.split('\n')
  const results: LangStat[] = []
  let current: LangStat | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[━─]/.test(trimmed)) continue
    if (/Language\s+Files/.test(line)) continue
    if (/\(Total\)/.test(line)) continue
    if (/^\s*Total\s/.test(line)) continue

    // Embedded: " |- Go   2   21   21   0   0"
    const em = line.match(
      /^\s*\|-\s+(\S+(?:\s+\S+)*?)\s{2,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/,
    )
    if (em && current) {
      current.nested ??= []
      current.nested.push({
        lang: em[1],
        lines: Number(em[3]),
        code: Number(em[4]),
        comments: Number(em[5]),
        blanks: Number(em[6]),
      })
      continue
    }

    // Main: " TypeScript   390   36643   30350   1627   4666"
    const m = line.match(
      /^\s+(\S+(?:\s+\S+)*?)\s{2,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/,
    )
    if (m) {
      current = {
        lang: m[1],
        files: Number(m[2]),
        lines: Number(m[3]),
        code: Number(m[4]),
        comments: Number(m[5]),
        blanks: Number(m[6]),
        nested: null,
      }
      results.push(current)
    }
  }

  return results.filter((l) => l.lines > 0)
}

// --- Tooltip ---

function Tooltip({ x, y, stat }: { x: number; y: number; stat: LangStat }) {
  const cp = pct(stat.code, stat.lines)
  const mp = pct(stat.comments, stat.lines)
  const bp = Math.max(0, 100 - cp - mp)

  return (
    <div className="cs-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <div className="cs-tooltip__head">
        <span
          className="cs-tooltip__dot"
          style={{ backgroundColor: getLangColor(stat.lang) }}
        />
        <span className="cs-tooltip__title">{stat.lang}</span>
        <span className="cs-tooltip__count">{fmtFull(stat.lines)} lines</span>
      </div>

      <div className="cs-tooltip__bar">
        <div style={{ width: `${cp}%`, background: FUNC_COLORS.code }} />
        <div style={{ width: `${mp}%`, background: FUNC_COLORS.comments }} />
        <div style={{ width: `${bp}%`, background: FUNC_COLORS.blanks }} />
      </div>

      <div className="cs-tooltip__grid">
        <span className="cs-tooltip__label">Files</span>
        <span className="cs-tooltip__val">{fmtFull(stat.files)}</span>
        <span className="cs-tooltip__label" style={{ color: FUNC_COLORS.code }}>
          Code
        </span>
        <span className="cs-tooltip__val">
          {fmtFull(stat.code)} <span className="cs-tooltip__pct">{cp}%</span>
        </span>
        <span
          className="cs-tooltip__label"
          style={{ color: FUNC_COLORS.comments }}
        >
          Comments
        </span>
        <span className="cs-tooltip__val">
          {fmtFull(stat.comments)}{' '}
          <span className="cs-tooltip__pct">{mp}%</span>
        </span>
        <span
          className="cs-tooltip__label"
          style={{ color: FUNC_COLORS.blanks }}
        >
          Blanks
        </span>
        <span className="cs-tooltip__val">
          {fmtFull(stat.blanks)} <span className="cs-tooltip__pct">{bp}%</span>
        </span>
      </div>

      {stat.nested && stat.nested.length > 0 && (
        <div className="cs-tooltip__nested">
          {stat.nested.map((n) => (
            <span key={n.lang} className="cs-tooltip__nested-item">
              <span
                className="cs-tooltip__dot cs-tooltip__dot--sm"
                style={{ backgroundColor: getLangColor(n.lang) }}
              />
              {n.lang} {fmt(n.lines)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Breakdown Bar ---

function BreakdownBar({
  code,
  comments,
  blanks: _blanks,
  total,
  height = 14,
}: {
  code: number
  comments: number
  blanks: number
  total: number
  height?: number
}) {
  if (total === 0) return null
  const cp = pct(code, total)
  const mp = pct(comments, total)
  const bp = Math.max(0, 100 - cp - mp)
  return (
    <div className="cs-breakdown" style={{ height, minWidth: 100 }}>
      <div style={{ width: `${cp}%`, background: FUNC_COLORS.code }} />
      <div style={{ width: `${mp}%`, background: FUNC_COLORS.comments }} />
      <div style={{ width: `${bp}%`, background: FUNC_COLORS.blanks }} />
    </div>
  )
}

// --- Treemap View ---

function TreemapView({ data }: { data: LangStat[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{
    x: number
    y: number
    stat: LangStat
  } | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const W = 700
    const H = 420
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    const root = d3
      .hierarchy({
        children: data.map((d) => ({ ...d, value: d.lines })),
      } as Record<string, unknown>)
      .sum((d: Record<string, unknown>) => (d.value as number) || 0)
      // oxlint-disable-next-line no-array-sort -- d3 hierarchy requires in-place sort
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap().size([W, H]).padding(2).round(true)(
      root as d3.HierarchyRectangularNode<unknown>,
    )

    for (const leaf of root.leaves()) {
      const node = leaf as d3.HierarchyRectangularNode<unknown>
      const d = node.data as LangStat & { value: number }
      const w = node.x1 - node.x0
      const h = node.y1 - node.y0
      const shorter = Math.min(w, h)
      // Scale radius with size: cap at 4px for large blocks,
      // shrink proportionally for small ones so they don't look overly round
      const rx = Math.min(4, shorter * 0.3)
      const g = svg.append('g')

      g.append('rect')
        .attr('x', node.x0)
        .attr('y', node.y0)
        .attr('width', w)
        .attr('height', h)
        .attr('fill', getLangColor(d.lang))
        .attr('rx', rx)
        .attr('opacity', 0.82)
        .style('cursor', 'pointer')

      const padX = 6
      const padY = 4
      const labelSize = 12
      const subSize = 10
      const lineGap = 2
      const labelY = padY + labelSize
      const subY = labelY + lineGap + subSize
      const availW = w - padX * 2

      if (availW > 4 && h >= labelY + padY) {
        const ctx = measureCtx()
        ctx.font = `500 ${labelSize}px sans-serif`
        const label = fitText(d.lang, availW, ctx)
        if (label) {
          g.append('text')
            .attr('x', node.x0 + padX)
            .attr('y', node.y0 + labelY)
            .text(label)
            .attr('fill', '#fff')
            .attr('font-size', `${labelSize}px`)
            .attr('font-weight', '500')
            .style('pointer-events', 'none')

          if (h >= subY + padY) {
            ctx.font = `${subSize}px sans-serif`
            const sl = fitText(`${fmt(d.lines)} lines`, availW, ctx)
            if (sl) {
              g.append('text')
                .attr('x', node.x0 + padX)
                .attr('y', node.y0 + subY)
                .text(sl)
                .attr('fill', 'rgba(255,255,255,0.75)')
                .attr('font-size', `${subSize}px`)
                .style('pointer-events', 'none')
            }
          }
        }
      }

      // Mini code-ratio bar
      if (w > 8 && h > 30) {
        const bX = node.x1 - 8
        const bY = node.y0 + 4
        const bH = h - 8
        g.append('rect')
          .attr('x', bX)
          .attr('y', bY)
          .attr('width', 4)
          .attr('height', bH)
          .attr('fill', 'rgba(0,0,0,0.15)')
          .attr('rx', 2)
        g.append('rect')
          .attr('x', bX)
          .attr('y', bY)
          .attr('width', 4)
          .attr('height', Math.max(1, bH * (d.code / d.lines)))
          .attr('fill', 'rgba(255,255,255,0.6)')
          .attr('rx', 2)
      }

      g.on('mouseenter', (ev) =>
        setTip({ x: ev.offsetX, y: ev.offsetY, stat: d }),
      ).on('mousemove', (ev) =>
        setTip({ x: ev.offsetX, y: ev.offsetY, stat: d }),
      )
    }

    svg.on('mouseleave', () => setTip(null))
  }, [data])

  return (
    <div className="cs-chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg ref={ref} width="100%" />
      {tip && <Tooltip x={tip.x} y={tip.y} stat={tip.stat} />}
    </div>
  )
}

// --- Bar View ---

function BarView({ data }: { data: LangStat[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{
    x: number
    y: number
    stat: LangStat
  } | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 90, left: 55 }
    const W = 700
    const H = 400
    const iW = W - margin.left - margin.right
    const iH = H - margin.top - margin.bottom
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.lang))
      .range([0, iW])
      .padding(0.25)

    const maxLines = d3.max(data, (d) => d.lines) ?? 0
    const y = d3.scaleLinear().domain([0, maxLines]).nice().range([iH, 0])

    // x axis
    g.append('g')
      .attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-6px')
      .attr('dy', '4px')
      .attr('font-size', '11px')
      .attr('fill', 'var(--cs-text-muted)')

    // y axis + grid
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => fmt(d as number))
          .tickSize(-iW),
      )
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', 'var(--cs-text-muted)')

    g.selectAll('.tick line').attr('stroke', 'var(--cs-grid)')
    g.selectAll('.domain').remove()

    // stacked bars
    for (const d of data) {
      const bx = x(d.lang)
      if (bx == null) continue
      const bw = x.bandwidth()
      let cy = iH
      const stack = [
        { val: d.code, color: FUNC_COLORS.code },
        { val: d.comments, color: FUNC_COLORS.comments },
        { val: d.blanks, color: FUNC_COLORS.blanks },
      ]
      for (const s of stack) {
        const sh = iH - y(s.val)
        cy -= sh
        g.append('rect')
          .attr('x', bx)
          .attr('y', cy)
          .attr('width', bw)
          .attr('height', sh)
          .attr('fill', s.color)
          .attr('rx', 1)
          .style('cursor', 'pointer')
          .on('mouseenter', (ev) =>
            setTip({ x: ev.offsetX, y: ev.offsetY, stat: d }),
          )
          .on('mousemove', (ev) =>
            setTip({ x: ev.offsetX, y: ev.offsetY, stat: d }),
          )
          .on('mouseleave', () => setTip(null))
      }

      if (d.lines >= 800) {
        g.append('text')
          .attr('x', bx + bw / 2)
          .attr('y', y(d.lines) - 5)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--cs-text-muted)')
          .attr('font-size', '11px')
          .text(fmt(d.lines))
      }
    }
  }, [data])

  return (
    <div className="cs-chart-wrap">
      <svg ref={ref} width="100%" />
      {tip && <Tooltip x={tip.x} y={tip.y} stat={tip.stat} />}
    </div>
  )
}

// --- Table View ---

function TableView({ data }: { data: LangStat[] }) {
  return (
    <div className="cs-table-wrap">
      <table className="cs-table">
        <thead>
          <tr>
            <th className="cs-table__th--left">Language</th>
            <th>Files</th>
            <th>Lines</th>
            <th>Code</th>
            <th>Comments</th>
            <th>Blanks</th>
            <th className="cs-table__th--left cs-table__th--breakdown">
              Breakdown
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.lang}>
              <td className="cs-lang-cell">
                <span
                  className="cs-lang-dot"
                  style={{ background: getLangColor(d.lang) }}
                />
                {d.lang}
              </td>
              <td>{fmtFull(d.files)}</td>
              <td title={fmtFull(d.lines)}>{fmt(d.lines)}</td>
              <td title={fmtFull(d.code)}>{fmt(d.code)}</td>
              <td title={fmtFull(d.comments)}>{fmt(d.comments)}</td>
              <td title={fmtFull(d.blanks)}>{fmt(d.blanks)}</td>
              <td>
                <BreakdownBar
                  code={d.code}
                  comments={d.comments}
                  blanks={d.blanks}
                  total={d.lines}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Main Widget ---

type ViewMode = 'treemap' | 'bar' | 'table'

export function TokeiWidget({
  raw,
  view = 'treemap',
}: {
  raw: string
  view?: ViewMode
}) {
  const data = useMemo(() => parseTokei(raw), [raw])
  const sorted = useMemo(
    () => data.toSorted((a, b) => b.lines - a.lines),
    [data],
  )

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, d) => ({
          files: acc.files + d.files,
          lines: acc.lines + d.lines,
          code: acc.code + d.code,
          comments: acc.comments + d.comments,
          blanks: acc.blanks + d.blanks,
        }),
        { files: 0, lines: 0, code: 0, comments: 0, blanks: 0 },
      ),
    [data],
  )

  if (data.length === 0) return null

  const metrics = [
    { label: 'Total files', value: fmt(totals.files) },
    { label: 'Total lines', value: fmt(totals.lines) },
    { label: 'Code lines', value: fmt(totals.code) },
    {
      label: 'Comment ratio',
      value: `${pct(totals.comments, totals.lines)}%`,
    },
  ]

  return (
    <div className="code-stats">
      <div className="cs-chart-area">
        {view === 'treemap' && <TreemapView data={sorted} />}
        {view === 'bar' && <BarView data={sorted} />}
        {view === 'table' && <TableView data={sorted} />}
      </div>

      <div className="cs-bottom-bar">
        <div className="cs-legend">
          {(['code', 'comments', 'blanks'] as const).map((k) => (
            <span key={k} className="cs-legend-item">
              <span
                className="cs-legend-dot"
                style={{ background: FUNC_COLORS[k] }}
              />
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </span>
          ))}
        </div>
        <div className="cs-summary">
          {metrics.map((m) => (
            <span key={m.label} className="cs-summary-item">
              <span className="cs-summary-label">{m.label}</span>{' '}
              <span className="cs-summary-value">{m.value}</span>
            </span>
          ))}
          <a
            href="https://github.com/xampprocky/tokei"
            target="_blank"
            rel="noopener noreferrer"
            className="cs-summary__link"
          >
            tokei
            <ArrowUpRight className="cs-summary__link-icon" strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  )
}
