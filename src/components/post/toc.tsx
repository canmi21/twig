/* src/components/post/toc.tsx */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TocEntry } from '~/lib/compiler/rehype-toc'

// Use the native replaceState from History.prototype to bypass TanStack
// Router's monkey-patched version, which triggers scroll restoration on
// every replaceState call and causes viewport jumps during natural scroll.
const nativeReplaceState = History.prototype.replaceState

function replaceHash(id: string) {
  const { pathname, search, hash } = window.location
  const nextHash = id ? `#${id}` : ''
  if (hash === nextHash) return
  nativeReplaceState.call(
    window.history,
    window.history.state,
    '',
    `${pathname}${search}${nextHash}`,
  )
}

export function Toc({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isClickScrollingRef = useRef(false)

  useEffect(() => {
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter(Boolean) as HTMLElement[]

    if (headings.length === 0) return

    observerRef.current = new IntersectionObserver(
      (intersections) => {
        if (isClickScrollingRef.current) return
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

      // Wait for smooth scroll to finish before re-enabling observer updates
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
