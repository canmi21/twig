/* src/components/post/toc.tsx */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TocEntry } from '~/lib/compiler/rehype-toc'

const TOP_DEAD_ZONE_PX = 64
const COLLAPSED_GAP_PX = 8
const EXPANDED_GAP_PX = 4
const LEAVE_DELAY_MS = 150
const EASE = [0.25, 0.1, 0.25, 1] as const
// Total morph duration — bar and text overlap within this window
const MORPH_S = 0.28

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

function estimateTextWidth(text: string): number {
  let width = 0
  for (const char of text) {
    if (/\p{Script=Han}/u.test(char)) {
      width += 8
      continue
    }
    width += char === ' ' ? 2 : 4
  }
  return Math.max(20, Math.min(56, width))
}

function estimateTextWidths(texts: string[]): Map<string, number> {
  const widths = new Map<string, number>()
  for (const text of texts) {
    widths.set(text, estimateTextWidth(text))
  }
  return widths
}

export function Toc({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isClickScrollingRef = useRef(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const barWidths = useMemo(
    () => estimateTextWidths(entries.map((e) => e.text)),
    [entries],
  )

  const handleEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    setIsOpen(true)
  }, [])

  const handleLeave = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = setTimeout(() => setIsOpen(false), LEAVE_DELAY_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
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

  return (
    <nav
      aria-label="Table of contents"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="
        hidden
        xl:fixed xl:top-1/2 xl:left-[max(1.5rem,calc((100vw-45rem)/4-5.5rem))]
        xl:z-30 xl:block xl:max-h-[calc(100vh-16rem)]
        xl:-translate-y-1/2 xl:overflow-y-auto
      "
    >
      <motion.ul
        initial={false}
        animate={{ gap: isOpen ? EXPANDED_GAP_PX : COLLAPSED_GAP_PX }}
        transition={{ duration: MORPH_S, ease: EASE }}
        className="flex flex-col"
      >
        {entries.map((entry) => {
          const isActive = activeId === entry.id
          const bw = barWidths.get(entry.text) ?? 24
          return (
            <li key={entry.id} className="relative">
              <AnimatePresence>
                {isActive && isOpen && (
                  <motion.div
                    layoutId="toc-indicator"
                    className="absolute top-[3px] left-0 h-3 w-0.5 rounded-full bg-foreground"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: MORPH_S * 0.6, ease: EASE }}
                  />
                )}
              </AnimatePresence>
              <a
                href={`#${entry.id}`}
                onClick={(e) => handleClick(e, entry.id)}
                className={`relative block pl-2 ${isActive ? 'text-foreground' : 'text-secondary'}`}
              >
                {/* Bar — leads the morph, starts immediately */}
                <motion.span
                  className="block rounded-full"
                  initial={false}
                  animate={{
                    width: isOpen ? 0 : bw,
                    height: isOpen ? 0 : 5,
                    opacity: isOpen ? 0 : isActive ? 0.8 : 0.35,
                  }}
                  transition={{ duration: MORPH_S, ease: EASE }}
                  style={{ backgroundColor: 'currentColor' }}
                />
                {/* Text — follows the bar with a slight delay, takes over mid-morph */}
                <motion.span
                  className="block truncate overflow-hidden text-[13px] leading-snug"
                  initial={false}
                  animate={{
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                  transition={{
                    duration: MORPH_S * 0.7,
                    delay: isOpen ? MORPH_S * 0.25 : 0,
                    ease: EASE,
                  }}
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
