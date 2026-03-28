/* src/components/site-nav.tsx */

import { Link } from '@tanstack/react-router'
import { SITE_TITLE } from '~/lib/content/metadata'
import { ThemeToggle } from '~/components/theme-toggle'

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-chrome/50 backdrop-blur-lg">
      <div className="mx-auto flex max-w-180 items-center justify-between p-5">
        <Link
          to="/"
          className="text-[13px] font-medium text-primary transition-colors hover:text-secondary"
        >
          {SITE_TITLE}
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/posts"
            className="text-[13px] text-secondary transition-colors hover:text-primary"
          >
            Posts
          </Link>
          <ThemeToggle className="cursor-pointer text-secondary transition-colors hover:text-primary" />
        </nav>
      </div>
    </header>
  )
}
