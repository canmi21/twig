/* src/routes/@/_dashboard/route.tsx */

import { Outlet, Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/@/_dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-4 py-5">
          <span className="text-sm font-medium text-primary">Console</span>
        </div>
        <nav className="flex-1 px-2">
          <Link
            to="/@/contents"
            className="block rounded-sm px-3 py-1.5 text-sm text-secondary hover:bg-raised hover:text-primary"
            activeProps={{
              className:
                'block rounded-sm px-3 py-1.5 text-sm bg-raised text-primary font-medium',
            }}
          >
            Posts
          </Link>
        </nav>
        <div className="border-t border-border px-2 py-3">
          <Link
            to="/"
            className="block px-3 py-1.5 text-sm text-secondary hover:text-primary"
          >
            Back to site
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
