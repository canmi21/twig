/* src/components/post/toc.tsx */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import type { TocEntry } from '~/lib/compiler/rehype-toc'

const TOP_DEAD_ZONE_PX = 64
const COLLAPSED_GAP_PX = 6
const EXPANDED_GAP_PX = 8

function getNativeReplaceState() {
  return window.History?.prototype.replaceState ?? window.history.replaceState
}

function replaceHash(id: string) {
  const { pathname, search, hash } = window.location
  const nextHash = id ? `#${id}` : ''
  if (hash === nextHash) return
  getNativeReplaceState().call(
    window.history,
    window.history.state,
    '',
    `${pathname}${search}${nextHash}`,
  )
}

function measureTextWidths(texts: string[]): Map<string, number> {
  const widths = new Map<string, number>()
  if (typeof document === 'undefined') return widths
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return widths
  ctx.font = '13px system-ui, sans-serif'
  for (const text of texts) {
    const measured = ctx.measureText(text).width
    widths.set(text, Math.max(20, Math.round(measured * 0.6)))
  }
  return widths
}

type Phase = 'collapsed' | 'expanded' | 'revealed'

export function Toc({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')
  const [phase, setPhase] = useState<Phase>('collapsed')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isClickScrollingRef = useRef(false)
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const barWidths = useMemo(
    () => measureTextWidths(entries.map((e) => e.text)),
    [entries],
  )

  const handleEnter = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    // Phase 1: expand spacing
    setPhase('expanded')
    // Phase 2: reveal text after bars finish expanding
    phaseTimerRef.current = setTimeout(() => setPhase('revealed'), 180)
  }, [])

  const handleLeave = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    setPhase('collapsed')
  }, [])

  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (isClickScrollingRef.current) return
      if (window.scrollY <= TOP_DEAD_ZONE_PX) {
        setActiveId('')
        replaceHash('')
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter(Boolean) as HTMLElement[]

    if (headings.length === 0) return

    observerRef.current = new IntersectionObserver(
      (intersections) => {
        if (isClickScrollingRef.current) return
        if (window.scrollY <= TOP_DEAD_ZONE_PX) return
        for (const entry of intersections) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            replaceHash(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    for (const el of headings) observerRef.current.observe(el)
    return () => observerRef.current?.disconnect()
  }, [entries])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault()
      const el = document.getElementById(id)
      if (!el) return

      isClickScrollingRef.current = true
      setActiveId(id)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      const onEnd = () => {
        isClickScrollingRef.current = false
        replaceHash(id)
      }

      if ('onscrollend' in window) {
        window.addEventListener('scrollend', onEnd, { once: true })
      } else {
        globalThis.setTimeout(onEnd, 600)
      }
    },
    [],
  )

  if (entries.length === 0) return null

  const isOpen = phase !== 'collapsed'
  const showText = phase === 'revealed'

  return (
    <nav
      aria-label="Table of contents"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="
        hidden
        xl:fixed xl:top-1/2 xl:left-[max(1.5rem,calc((100vw-45rem)/4-5.5rem))]
        xl:block xl:max-h-[calc(100vh-16rem)]
        xl:-translate-y-1/2 xl:overflow-y-auto
      "
    >
      <motion.ul
        style={{ gap: COLLAPSED_GAP_PX }}
        animate={{ gap: isOpen ? EXPANDED_GAP_PX : COLLAPSED_GAP_PX }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex flex-col"
      >
        {entries.map((entry) => {
          const isActive = activeId === entry.id
          const bw = barWidths.get(entry.text) ?? 24
          return (
            <li key={entry.id} className="relative">
              {isActive && showText && (
                <motion.div
                  layoutId="toc-indicator"
                  className="absolute top-[3px] left-0 h-3 w-0.5 rounded-full bg-primary"
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 28,
                  }}
                />
              )}
              <a
                href={`#${entry.id}`}
                onClick={(e) => handleClick(e, entry.id)}
                className={`relative block pl-2 ${isActive ? 'text-primary' : 'text-secondary'}`}
              >
                {/* Bar — collapses to zero when text is shown */}
                <motion.span
                  className="block rounded-full"
                  animate={{
                    width: showText ? 0 : bw,
                    height: showText ? 0 : 4,
                    opacity: showText ? 0 : isActive ? 0.8 : 0.35,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: 'currentColor' }}
                />
                {/* Text — fades in during revealed phase */}
                <motion.span
                  className="block truncate overflow-hidden text-[13px] leading-snug"
                  animate={{
                    height: showText ? 'auto' : 0,
                    opacity: showText ? 1 : 0,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {entry.text}
                </motion.span>
              </a>
            </li>
          )
        })}
      </motion.ul>
    </nav>
  )
}
