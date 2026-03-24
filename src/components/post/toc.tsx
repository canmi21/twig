/* src/components/post/toc.tsx */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TocEntry } from '~/lib/compiler/rehype-toc'

export function Toc({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const clickScrollTimeoutRef = useRef<number | null>(null)
  const isClickScrollingRef = useRef(false)
  const scrollEndHandlerRef = useRef<(() => void) | null>(null)

  const syncHash = useCallback((id: string) => {
    const { pathname, search, hash } = window.location
    const nextHash = id ? `#${id}` : ''
    if (hash === nextHash) return
    window.history.replaceState(null, '', `${pathname}${search}${nextHash}`)
  }, [])

  const clearClickScrollSync = useCallback(() => {
    if (clickScrollTimeoutRef.current !== null) {
      window.clearTimeout(clickScrollTimeoutRef.current)
      clickScrollTimeoutRef.current = null
    }
    if (scrollEndHandlerRef.current) {
      window.removeEventListener('scrollend', scrollEndHandlerRef.current)
      scrollEndHandlerRef.current = null
    }
  }, [])

  useEffect(() => {
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter(Boolean) as HTMLElement[]

    if (headings.length === 0) return

    observerRef.current = new IntersectionObserver(
      (intersections) => {
        // Find the topmost visible heading
        for (const entry of intersections) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    for (const el of headings) observerRef.current.observe(el)
    return () => {
      observerRef.current?.disconnect()
      clearClickScrollSync()
    }
  }, [clearClickScrollSync, entries])

  useEffect(() => {
    if (!activeId) return
    if (isClickScrollingRef.current) return
    syncHash(activeId)
  }, [activeId, syncHash])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault()
      const el = document.getElementById(id)
      if (el) {
        clearClickScrollSync()
        isClickScrollingRef.current = true
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveId(id)
        const finishSync = () => {
          clearClickScrollSync()
          isClickScrollingRef.current = false
          syncHash(id)
        }
        if ('onscrollend' in window) {
          scrollEndHandlerRef.current = finishSync
          window.addEventListener('scrollend', finishSync, { once: true })
        } else {
          clickScrollTimeoutRef.current = window.setTimeout(finishSync, 600)
        }
      }
    },
    [clearClickScrollSync, syncHash],
  )

  if (entries.length === 0) return null

  return (
    <nav
      aria-label="Table of contents"
      className="
        hidden
        xl:fixed xl:top-1/2 xl:left-[max(1.5rem,calc((100vw-45rem)/4-5.5rem))]
        xl:block xl:max-h-[calc(100vh-6rem)] xl:w-44
        xl:-translate-y-1/2 xl:overflow-y-auto
      "
    >
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(e) => handleClick(e, entry.id)}
              className={`
                block truncate text-[13px] leading-snug
                ${activeId === entry.id ? 'text-primary' : 'text-secondary'}
              `}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
