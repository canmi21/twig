/* src/components/navbar.tsx */

import { Link } from '@tanstack/react-router'
import { ThemeToggle } from './theme-toggle'

const navFont = { fontFamily: "'Fira Code', monospace" } as const
const linkClass =
  'text-[13px] font-light text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100'
const activeLinkClass = 'text-[13px] font-light text-primary opacity-100'

export function Navbar() {
  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-40 flex items-center justify-center py-4">
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
      </nav>
      <ThemeToggle className="fixed top-5 right-5 z-50 cursor-pointer rounded-full p-2 text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100" />
    </>
  )
}
