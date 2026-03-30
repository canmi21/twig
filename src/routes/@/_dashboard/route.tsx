/* src/routes/@/_dashboard/route.tsx */

import { useState, useEffect, useCallback } from 'react'
import {
  Outlet,
  Link,
  createFileRoute,
  useMatchRoute,
} from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { fetchSidebarData } from '~/server/dashboard'

export const Route = createFileRoute('/@/_dashboard')({
  loader: () => fetchSidebarData(),
  component: DashboardLayout,
})

const SIDEBAR_KEY = 'dashboard-sidebar-collapsed'

const navItems = [
  { to: '/@' as const, label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/@/contents' as const, label: 'Posts', icon: FileText, exact: false },
  { to: '/@/users' as const, label: 'Users', icon: Users, exact: false },
  {
    to: '/@/comments' as const,
    label: 'Comments',
    icon: MessageSquare,
    exact: false,
  },
]

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

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === SIDEBAR_KEY) setCollapsed(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const matchRoute = useMatchRoute()

  return (
    <div className="noise-bg relative flex h-screen overflow-hidden bg-base text-[14px] text-foreground select-none">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-theme/5 blur-[120px]" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside
        className={`relative z-10 flex shrink-0 flex-col bg-subtle/40 backdrop-blur-md transition-[width] duration-200 ease-in-out ${collapsed ? 'w-16' : 'w-56'}`}
      >
        {/* Brand */}
        <div
          className={`flex h-16 shrink-0 items-center ${collapsed ? 'justify-center' : 'px-6'}`}
        >
          {!collapsed && (
            <span className="text-[14px] font-medium tracking-tight text-foreground/80">
              Console
            </span>
          )}
          {collapsed && (
            <div className="size-2 rounded-full bg-theme animate-pulse" />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact
              ? !!matchRoute({ to })
              : !!matchRoute({ to, fuzzy: true })
            const showBadge = label === 'Comments' && pendingComments > 0

            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex items-center gap-3 rounded-lg py-2 transition-all duration-200 ${collapsed ? 'justify-center px-0' : 'px-3'} ${
                  isActive
                    ? 'bg-theme-subtle text-theme-text shadow-sm'
                    : 'text-secondary hover:bg-tint hover:text-foreground'
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                />
                {!collapsed && (
                  <span className="font-medium tracking-wide">{label}</span>
                )}
                {showBadge && !collapsed && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-surface ring-2 ring-surface">
                    {pendingComments}
                  </span>
                )}
                {showBadge && collapsed && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" />
                )}
                {isActive && !collapsed && (
                  <div className="absolute left-0 h-4 w-1 rounded-r-full bg-theme" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-1 p-3">
          {auth.session && !collapsed && (
            <div className="mb-4 px-3">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {auth.session.user.name}
              </div>
              <div className="truncate text-[11px] text-dim">
                {auth.session.user.email}
              </div>
            </div>
          )}
          <Link
            to="/"
            className={`flex items-center gap-3 rounded-lg text-secondary transition-all hover:bg-tint hover:text-foreground ${collapsed ? 'justify-center py-2' : 'px-3 py-2'}`}
            title={collapsed ? 'Back to site' : undefined}
          >
            <ArrowLeft size={18} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && <span className="font-medium">Exit</span>}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className={`flex w-full items-center gap-3 rounded-lg text-secondary transition-all hover:bg-tint hover:text-foreground ${collapsed ? 'justify-center py-2' : 'px-3 py-2'}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronsRight size={18} strokeWidth={1.5} />
            ) : (
              <>
                <ChevronsLeft
                  size={18}
                  strokeWidth={1.5}
                  className="shrink-0"
                />
                <span className="font-medium">Minimize</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-208 px-8 pt-12 pb-24 lg:px-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
