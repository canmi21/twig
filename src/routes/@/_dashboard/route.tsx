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
    <div className="geist flex h-screen bg-geist-bg">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-geist-200 bg-geist-bg-2 transition-[width] duration-150 ease-in-out ${collapsed ? 'w-[48px]' : 'w-[200px]'}`}
      >
        {/* Brand */}
        <div
          className={`flex h-12 shrink-0 items-center border-b border-geist-200 ${collapsed ? 'justify-center' : 'px-4'}`}
        >
          {!collapsed && (
            <span className="text-[13px] font-semibold text-geist-1000">
              Console
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-px overflow-y-auto px-1.5 py-2">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact
              ? !!matchRoute({ to })
              : !!matchRoute({ to, fuzzy: true })
            const showBadge = label === 'Comments' && pendingComments > 0

            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 rounded-md text-[13px] transition-colors ${collapsed ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5'} ${isActive ? 'bg-geist-1000 font-medium text-geist-bg' : 'text-geist-900 hover:bg-geist-100'}`}
                title={collapsed ? label : undefined}
              >
                <Icon
                  size={15}
                  strokeWidth={isActive ? 1.8 : 1.5}
                  className="shrink-0"
                />
                {!collapsed && <span>{label}</span>}
                {showBadge && !collapsed && (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-geist-error px-1 text-[10px] leading-none font-semibold text-white">
                    {pendingComments}
                  </span>
                )}
                {showBadge && collapsed && (
                  <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-geist-error" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-geist-200 px-1.5 py-2">
          {auth.session && !collapsed && (
            <div className="mb-2 px-2.5">
              <div className="truncate text-[12px] font-medium text-geist-1000">
                {auth.session.user.name}
              </div>
              <div className="truncate text-[11px] text-geist-600">
                {auth.session.user.email}
              </div>
            </div>
          )}
          <Link
            to="/"
            className={`flex items-center gap-2.5 rounded-md text-[13px] text-geist-600 transition-colors hover:bg-geist-100 hover:text-geist-1000 ${collapsed ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5'}`}
            title={collapsed ? 'Back to site' : undefined}
          >
            <ArrowLeft size={15} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && <span>Back to site</span>}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className={`flex w-full items-center gap-2.5 rounded-md text-[13px] text-geist-600 transition-colors hover:bg-geist-100 hover:text-geist-1000 ${collapsed ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5'}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronsRight size={15} strokeWidth={1.5} />
            ) : (
              <>
                <ChevronsLeft
                  size={15}
                  strokeWidth={1.5}
                  className="shrink-0"
                />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
