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
  // Use a very permissive check for development
  const isDev = process.env.NODE_ENV !== 'production'
  let email = 'dev@localhost'

  try {
    // 1. CF Access gate (skip in dev)
    if (!isDev) {
      const identity = await verifyCfAccess(getRequest())
      if (!identity) throw new Error('Unauthorized')
      email = identity.email
    }

    // 2. Better Auth session
    // Wrap in try-catch to prevent initialization errors from killing the route
    const auth = getAuth()
    const session = await auth.api
      .getSession({ headers: getRequestHeaders() })
      .catch(() => null)

    // 3. In dev, auto-login as seed admin if no session
    if (isDev && !session) {
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
  } catch (e) {
    // In dev, we never want to 401 the whole route during local testing
    if (isDev) {
      // Auth failed in dev — fall through to seed admin
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
    throw e
  }
})

export const Route = createFileRoute('/@')({
  beforeLoad: async () => {
    try {
      const auth = await checkAuth()
      return { auth }
    } catch (err) {
      throw new Error('Unauthorized', { cause: err })
    }
  },
  errorComponent: ({ error }) => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <span className="text-xl font-medium">401</span>
        <span className="mx-4 h-8 w-px bg-boundary inline-block" />
        <span className="text-sm text-secondary">Unauthorized</span>
        <pre className="mt-4 text-[10px] text-dim opacity-50">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    </div>
  ),
  component: AdminGate,
})

function AdminGate() {
  const { auth } = Route.useRouteContext()

  if (!auth.session) {
    return (
      <div className="noise-bg flex h-screen items-center justify-center bg-base text-foreground">
        <div className="text-center">
          <p className="text-sm text-secondary">
            Sign in with Better Auth to access the console.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-full bg-foreground px-6 py-2 text-sm font-medium text-surface transition-transform hover:scale-105"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (auth.session.user.role !== 'admin') {
    return (
      <div className="noise-bg flex h-screen items-center justify-center bg-base text-foreground">
        <div className="text-center">
          <span className="text-xl font-medium">403</span>
          <span className="mx-4 h-8 w-px bg-boundary inline-block" />
          <span className="text-sm text-secondary">No permission</span>
        </div>
      </div>
    )
  }

  return <Outlet />
}
