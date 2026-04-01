/* src/routes/@/_dashboard/route.tsx */

import { Outlet, Link, createFileRoute } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  Undo2,
} from 'lucide-react'
import { fetchSidebarData } from '~/server/dashboard'

export const Route = createFileRoute('/@/_dashboard')({
  loader: () => fetchSidebarData(),
  component: DashboardLayout,
})

const iconClass = 'size-[18px]'
const linkClass =
  'relative flex items-center justify-center rounded-sm p-2 text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100'
const activeLinkClass =
  'relative flex items-center justify-center rounded-sm p-2 text-primary opacity-100'

function DashboardLayout() {
  const { pendingComments: _pending } = Route.useLoaderData()

  return (
    <div className="flex h-screen">
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-border">
        <nav className="flex flex-1 flex-col items-center gap-1 pt-4">
          <Link
            to="/@"
            activeOptions={{ exact: true }}
            className={linkClass}
            activeProps={{ className: activeLinkClass }}
            title="Overview"
          >
            <LayoutDashboard className={iconClass} strokeWidth={1.8} />
          </Link>
          <Link
            to="/@/contents"
            className={linkClass}
            activeProps={{ className: activeLinkClass }}
            title="Posts"
          >
            <FileText className={iconClass} strokeWidth={1.8} />
          </Link>
          <Link
            to="/@/users"
            className={linkClass}
            activeProps={{ className: activeLinkClass }}
            title="Users"
          >
            <Users className={iconClass} strokeWidth={1.8} />
          </Link>
          <Link
            to="/@/comments"
            className={linkClass}
            activeProps={{ className: activeLinkClass }}
            title="Comments"
          >
            <MessageSquare className={iconClass} strokeWidth={1.8} />
          </Link>
        </nav>
        <div className="border-t border-border py-3">
          <Link
            to="/"
            className="flex items-center justify-center rounded-sm p-2 text-primary opacity-(--opacity-faint) transition-opacity duration-140 hover:opacity-100"
            title="Back to site"
          >
            <Undo2 className={iconClass} strokeWidth={1.8} />
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-240 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
