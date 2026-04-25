/* src/components/navbar.tsx */

import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ThemeToggle } from './theme-toggle'

const navFont = {
  fontFamily:
    "'Miranda Sans', 'Roboto', 'Source Sans 3', 'CJK Sans', system-ui, -apple-system, sans-serif",
} as const
const linkClass =
  'text-[17px] font-[500] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100'
const activeLinkClass = 'text-[17px] font-[500] text-primary opacity-100'

export function Navbar({ left }: { left?: ReactNode } = {}) {
  return (
    <nav className="absolute inset-x-0 top-0 z-40 flex h-[62px] items-center justify-center px-5">
      {left && (
        <div className="absolute top-1/2 left-6 -translate-y-1/2">{left}</div>
      )}
      <div className="flex items-center gap-6" style={navFont}>
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className={linkClass}
          activeProps={{ className: activeLinkClass }}
        >
          Home
        </Link>
        <Link
          to="/posts"
          className={linkClass}
          activeProps={{ className: activeLinkClass }}
        >
          Blog
        </Link>
      </div>
      <ThemeToggle className="absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer rounded-full p-2 text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100" />
    </nav>
  )
}
