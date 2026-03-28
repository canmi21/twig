/* src/components/site-nav.tsx */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Undo2, Link as LinkIcon, Check } from 'lucide-react'
import { SITE_TITLE } from '~/lib/content/metadata'
import { ThemeToggle } from '~/components/theme-toggle'

export interface ArticleInfo {
  title: string
  description?: string
}

interface SiteNavProps {
  article?: ArticleInfo
}

const NAV_HEIGHT = 56

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/posts', label: 'Posts' },
  { href: '/note', label: 'Note' },
  { href: '/about', label: 'About' },
]

export function SiteNav({ article }: SiteNavProps) {
  const [articleMode, setArticleMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (!article) return

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY.current
      lastScrollY.current = y
      if (Math.abs(delta) < 2) return
      setArticleMode(delta > 0)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [article])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  const isArticleMode = !!(article && articleMode)

  return (
    <header
      className="sticky top-0 z-40 overflow-hidden border-b border-border bg-chrome/50 backdrop-blur-lg"
      style={{ height: NAV_HEIGHT }}
    >
      {/* Single strip: normal nav on top, article nav below. Slides up/down as one unit. */}
      <motion.div
        initial={false}
        animate={{ y: isArticleMode ? -NAV_HEIGHT : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
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
          className="flex items-center justify-between px-8"
          style={{ height: NAV_HEIGHT }}
        >
          <Link
            to="/posts"
            className="shrink-0 text-secondary transition-colors hover:text-primary"
            aria-label="Back to posts"
          >
            <Undo2 className="size-4" strokeWidth={1.8} />
          </Link>
          <div className="mx-auto w-full max-w-208 min-w-0 px-8 sm:px-14">
            <div className="truncate text-[13px] font-medium text-primary">
              {article?.title}
            </div>
            {article?.description && (
              <div className="truncate text-[11px] text-tertiary">
                {article.description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 text-secondary transition-colors hover:text-primary"
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="size-4" strokeWidth={1.8} />
            ) : (
              <LinkIcon className="size-4" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </motion.div>
    </header>
  )
}
