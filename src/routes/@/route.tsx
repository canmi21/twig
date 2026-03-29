/* src/routes/@/route.tsx */

import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server'
import { verifyCfAccess } from '~/server/auth'
import { getAuth } from '~/server/better-auth'

interface AdminAuth {
  email: string
  session: {
    user: { id: string; name: string; email: string; role: string | null }
  } | null
}

const checkAuth = createServerFn().handler(async (): Promise<AdminAuth> => {
  // 1. CF Access gate (skip in dev)
  let email = 'dev@localhost'
  if (!import.meta.env.DEV) {
    const identity = await verifyCfAccess(getRequest())
    if (!identity) throw new Error('Unauthorized')
    email = identity.email
  }

  // 2. Better Auth session (may be null, may throw in dev without DB)
  const session = await getAuth()
    .api.getSession({ headers: getRequestHeaders() })
    .catch(() => null)

  // 3. In dev, auto-login as seed admin if no session
  if (import.meta.env.DEV && !session) {
    return {
      email,
      session: {
        user: {
          id: 'dev-user-admin',
          name: 'Admin',
          email: 'admin@dev.local',
          role: 'admin',
        },
      },
    }
  }

  return {
    email,
    session: session
      ? {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: (session.user as Record<string, unknown>).role as
              | string
              | null,
          },
        }
      : null,
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
      <span className="mx-4 h-8 w-px bg-boundary" />
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
          <p className="text-sm text-secondary">
            Sign in with Better Auth to access the console.
          </p>
          <Link
            to="/login"
            className="mt-3 inline-block rounded-sm bg-foreground px-4 py-1.5 text-sm text-surface"
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
        <span className="text-xl font-medium">403</span>
        <span className="mx-4 h-8 w-px bg-boundary" />
        <span className="text-sm text-secondary">No permission</span>
      </div>
    )
  }

  return <Outlet />
}
