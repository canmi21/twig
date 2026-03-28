/* src/routes/@/_dashboard/route.tsx */

import { Outlet, Link, createFileRoute } from '@tanstack/react-router'
import { FileText, Users, MessageSquare, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/@/_dashboard')({
  component: DashboardLayout,
})

const navItems = [
  { to: '/@/contents' as const, label: 'Posts', icon: FileText },
  { to: '/@/users' as const, label: 'Users', icon: Users },
  { to: '/@/comments' as const, label: 'Comments', icon: MessageSquare },
]

function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-4 py-5">
          <span className="text-sm font-medium text-primary">Console</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-raised hover:text-primary"
              activeProps={{
                className:
                  'flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm bg-raised text-primary font-medium transition-colors',
              }}
            >
              <Icon size={15} strokeWidth={1.7} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-2 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary transition-colors hover:text-primary"
          >
            <ArrowLeft size={15} strokeWidth={1.7} className="shrink-0" />
            Back to site
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
