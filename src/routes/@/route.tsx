/* src/routes/@/route.tsx */

import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getAuth } from '~/server/better-auth'

interface AdminAuth {
  session: {
    user: { id: string; name: string; email: string; role: string | null }
  } | null
}

// Auth model: Better Auth is the single source of truth. In both dev
// and prod, the dashboard is gated by a real session cookie — no
// fallbacks, no auto-login. Dev convenience lives in the /__dev route
// (tree-shaken from prod builds), where a debug panel can sign in as
// a seeded identity through the same OTP flow that prod uses.
const checkAuth = createServerFn().handler(async (): Promise<AdminAuth> => {
  const session = await getAuth().api.getSession({
    headers: getRequestHeaders(),
  })
  if (!session) return { session: null }
  return {
    session: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as { role?: string | null }).role ?? null,
      },
    },
  }
})

export const Route = createFileRoute('/@')({
  beforeLoad: async () => {
    try {
      const auth = await checkAuth()
      return { auth }
    } catch {
      throw new Error('Unauthorized')
    }
  },
  errorComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <span className="text-xl font-medium">401</span>
      <span className="mx-4 h-8 w-px bg-border" />
      <span className="text-sm text-secondary">Unauthorized</span>
    </div>
  ),
  component: AdminGate,
})

function AdminGate() {
  const { auth } = Route.useRouteContext()

  if (!auth.session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-[13px] text-primary opacity-(--opacity-muted)">
            Sign in to access the console.
          </p>
          <Link
            to="/login"
            search={{ callback: '/@' }}
            className="mt-3 inline-block rounded-sm bg-primary px-4 py-1.5 text-[13px] font-[560] text-surface"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (auth.session.user.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-[17px] font-[560]">403</span>
        <span className="mx-4 h-8 w-px bg-border" />
        <span className="text-[13px] text-primary opacity-(--opacity-muted)">
          No permission
        </span>
      </div>
    )
  }

  return <Outlet />
}
