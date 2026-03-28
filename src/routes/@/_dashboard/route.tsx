/* src/routes/@/_dashboard/route.tsx */

import { useState, useEffect, useCallback } from 'react'
import {
  Outlet,
  Link,
  createFileRoute,
  useMatchRoute,
} from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  FileText,
  Users,
  MessageSquare,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { fetchSidebarData } from '~/server/dashboard'

export const Route = createFileRoute('/@/_dashboard')({
  loader: () => fetchSidebarData(),
  component: DashboardLayout,
})

const SIDEBAR_KEY = 'dashboard-sidebar-collapsed'

const navItems = [
  { to: '/@/contents' as const, label: 'Posts', icon: FileText },
  { to: '/@/users' as const, label: 'Users', icon: Users },
  { to: '/@/comments' as const, label: 'Comments', icon: MessageSquare },
]

const springStandard = { type: 'spring' as const, stiffness: 300, damping: 28 }

function DashboardLayout() {
  const { pendingComments } = Route.useLoaderData()
  const { auth } = Route.useRouteContext()

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

  const matchRoute = useMatchRoute()

  return (
    <div className="flex h-screen">
      <motion.aside
        className="flex shrink-0 flex-col border-r border-border bg-surface"
        initial={false}
        animate={{ width: collapsed ? 56 : 208 }}
        transition={springStandard}
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
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = !!matchRoute({ to, fuzzy: true })
            const showBadge = label === 'Comments' && pendingComments > 0

            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center rounded-sm text-sm transition-colors ${collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-3 py-1.5'} ${isActive ? 'font-medium text-primary' : 'text-secondary hover:text-primary'}`}
                title={collapsed ? label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-sm bg-raised"
                    transition={springStandard}
                  />
                )}
                <Icon
                  size={15}
                  strokeWidth={1.7}
                  className="relative z-10 shrink-0"
                />
                <span
                  className={`relative z-10 whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'}`}
                >
                  {label}
                </span>
                {showBadge && !collapsed && (
                  <span className="relative z-10 ml-auto rounded-full bg-caution/15 px-1.5 py-0.5 text-[11px] leading-none text-caution">
                    {pendingComments}
                  </span>
                )}
                {showBadge && collapsed && (
                  <span className="absolute top-0.5 right-1 z-10 size-1.5 rounded-full bg-caution" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info + back link */}
        <div className="border-t border-border px-2 py-3">
          {auth.session && !collapsed && (
            <div className="mb-2 px-3 py-1">
              <div className="truncate text-[13px] font-medium text-primary">
                {auth.session.user.name}
              </div>
              <div className="truncate text-[11px] text-tertiary">
                {auth.session.user.email}
              </div>
            </div>
          )}
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
      </motion.aside>

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="mx-auto max-w-240 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
