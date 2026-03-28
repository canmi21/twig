/* src/routes/@/_dashboard/route.tsx */

import { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, createFileRoute } from '@tanstack/react-router'
import {
  FileText,
  Users,
  MessageSquare,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

export const Route = createFileRoute('/@/_dashboard')({
  component: DashboardLayout,
})

const SIDEBAR_KEY = 'dashboard-sidebar-collapsed'

const navItems = [
  { to: '/@/contents' as const, label: 'Posts', icon: FileText },
  { to: '/@/users' as const, label: 'Users', icon: Users },
  { to: '/@/comments' as const, label: 'Comments', icon: MessageSquare },
]

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  })

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === SIDEBAR_KEY) setCollapsed(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="flex h-screen">
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${collapsed ? 'w-14' : 'w-52'}`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <span
            className={`text-sm font-medium whitespace-nowrap text-primary transition-opacity duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'}`}
          >
            Console
          </span>
          <button
            type="button"
            onClick={toggle}
            className="text-secondary transition-colors hover:text-primary"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.7} />
            ) : (
              <PanelLeftClose size={15} strokeWidth={1.7} />
            )}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center rounded-sm text-sm text-secondary transition-colors hover:bg-raised hover:text-primary ${collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-3 py-1.5'}`}
              activeProps={{
                className: `flex items-center rounded-sm text-sm bg-raised text-primary font-medium transition-colors ${collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-3 py-1.5'}`,
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={15} strokeWidth={1.7} className="shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'}`}
              >
                {label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-2 py-3">
          <Link
            to="/"
            className={`flex items-center text-sm text-secondary transition-colors hover:text-primary ${collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-3 py-1.5'}`}
            title={collapsed ? 'Back to site' : undefined}
          >
            <ArrowLeft size={15} strokeWidth={1.7} className="shrink-0" />
            <span
              className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'}`}
            >
              Back to site
            </span>
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="mx-auto max-w-240 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
