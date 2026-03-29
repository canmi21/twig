/* src/components/site-nav.tsx */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, useMotionValue, animate } from 'motion/react'
import { Undo2, Forward, Check } from 'lucide-react'
import { SITE_TITLE } from '~/lib/content/metadata'
import { ThemeToggle } from '~/components/theme-toggle'

export interface ArticleInfo {
  title: string
  description?: string
  category?: string
}

interface SiteNavProps {
  article?: ArticleInfo
}

const NAV_HEIGHT = 56
// Mouse wheel events produce large deltas; touchpad events are small and continuous
// deltaMode 0 = pixel (touchpad), 1 = line (mouse wheel discrete steps)
// Mouse wheel on most browsers: deltaMode=0 but deltaY is a multiple of ~100
const WHEEL_ANIM = { duration: 0.3, ease: [0.33, 0, 0.2, 1] as const }
// Max pixels the strip can move per scroll event (caps fast touchpad swipes)
const TRACKPAD_MAX_STEP = 4

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/posts', label: 'Posts' },
  { href: '/note', label: 'Note' },
  { href: '/about', label: 'About' },
]

export function SiteNav({ article }: SiteNavProps) {
  const y = useMotionValue(0)
  const [copied, setCopied] = useState(false)
  const lastScrollY = useRef(0)
  const wheelAnimating = useRef(false)
  const isMouseWheel = useRef(false)
  const deviceDetected = useRef(false)
  const initAnimating = useRef(false)
  const mountedAt = useRef(0)

  useEffect(() => {
    if (!article) return
    lastScrollY.current = window.scrollY
    mountedAt.current = Date.now()

    function snapToNearest() {
      const cur = y.get()
      if (cur === 0 || cur === -NAV_HEIGHT) return

      const target = cur < -NAV_HEIGHT / 2 ? -NAV_HEIGHT : 0
      const rawVel = y.getVelocity()
      const snapDir = target < cur ? -1 : 1
      // Use 0.5x velocity, but guarantee a minimum so snap is always smooth
      const MIN_SNAP_VEL = 200 // px/s
      const scaled = rawVel * 0.5
      const snapVel =
        Math.abs(scaled) >= MIN_SNAP_VEL ? scaled : snapDir * MIN_SNAP_VEL

      // Snap nav strip
      animate(y, target, {
        type: 'spring',
        stiffness: 350,
        damping: 30,
        velocity: snapVel,
      })
    }

    function onWheel(e: WheelEvent) {
      // Mouse wheel: deltaMode=1 (line), or pixel mode with large discrete steps
      // Only classify once per scroll session — first event decides
      if (!deviceDetected.current) {
        deviceDetected.current = true
        isMouseWheel.current =
          e.deltaMode === 1 || (e.deltaMode === 0 && Math.abs(e.deltaY) >= 50)
      }
    }

    function onScroll() {
      const sy = window.scrollY
      const delta = sy - lastScrollY.current
      lastScrollY.current = sy
      if (Math.abs(delta) < 1) return

      // Animation already in flight — don't restart it
      if (wheelAnimating.current || initAnimating.current) return

      // First scroll after mount (e.g. browser jumping to hash):
      // always animate fully to the direction, 300ms, then resume normal logic
      if (mountedAt.current) {
        mountedAt.current = 0
        initAnimating.current = true
        const target = delta > 0 ? -NAV_HEIGHT : 0
        animate(y, target, {
          duration: 0.5,
          ease: [0.25, 0.1, 0.25, 1],
          onComplete: () => {
            initAnimating.current = false
          },
        })
        return
      }

      // Mouse wheel: 300ms animation
      if (isMouseWheel.current) {
        const target = delta > 0 ? -NAV_HEIGHT : 0
        wheelAnimating.current = true
        animate(y, target, {
          ...WHEEL_ANIM,
          onComplete: () => {
            wheelAnimating.current = false
          },
        })
        return
      }

      // Touchpad: follow scroll at 0.5x ratio, capped at max step
      wheelAnimating.current = false
      const scaled = delta * 0.5
      const capped =
        Math.sign(scaled) * Math.min(Math.abs(scaled), TRACKPAD_MAX_STEP)
      const cur = y.get()
      y.set(Math.max(-NAV_HEIGHT, Math.min(0, cur - capped)))
    }

    function onScrollEnd() {
      // Reset device detection for next scroll session
      deviceDetected.current = false
      // Programmatic animations handle their own completion
      if (wheelAnimating.current) {
        wheelAnimating.current = false
        return
      }
      if (initAnimating.current) return
      // Touchpad: snap to nearest panel using remaining momentum
      snapToNearest()
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', onScrollEnd)
    }

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
      if ('onscrollend' in window) {
        window.removeEventListener('scrollend', onScrollEnd)
      }
    }
  }, [article, y])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  return (
    <header
      className="sticky top-0 z-40 overflow-hidden border-b border-border bg-chrome/50 backdrop-blur-sm"
      style={{ height: NAV_HEIGHT }}
    >
      <motion.div style={{ y }}>
        {/* Panel 1: Normal navigation */}
        <div
          className="flex items-center justify-between px-8"
          style={{ height: NAV_HEIGHT }}
        >
          <Link
            to="/"
            className="shrink-0 text-[13px] font-medium text-primary transition-colors hover:text-secondary"
          >
            {SITE_TITLE}
          </Link>
          <nav className="flex items-center gap-5">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-[13px] text-secondary transition-colors hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>
          <ThemeToggle className="shrink-0 cursor-pointer text-secondary transition-colors hover:text-primary" />
        </div>

        {/* Panel 2: Article mode */}
        <div
          className="relative flex items-center"
          style={{ height: NAV_HEIGHT }}
        >
          {/* Back + copy link: absolute, don't affect center layout */}
          <Link
            to="/posts"
            className="absolute left-8 text-secondary transition-colors hover:text-primary"
            aria-label="Back to posts"
          >
            <Undo2 className="size-4" strokeWidth={1.8} />
          </Link>
          <button
            type="button"
            onClick={handleCopyLink}
            className="absolute right-8 text-secondary transition-colors hover:text-primary"
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="size-4" strokeWidth={1.8} />
            ) : (
              <Forward className="size-4" strokeWidth={1.8} />
            )}
          </button>
          {/* Title + info area: aligns with paper midpoint */}
          <div className="mx-auto flex w-full max-w-208 min-w-0 items-center justify-between px-4 sm:px-7">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-primary">
                {article?.title}
              </div>
              {article?.description && (
                <div className="truncate text-[11px] text-tertiary">
                  {article.description}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] text-tertiary">
                {article?.category ?? 'uncategorized'}
              </div>
              <div className="text-[12px] text-secondary">{SITE_TITLE}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </header>
  )
}
