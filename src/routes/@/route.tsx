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

function toAdminAuth(
  session: { user: Record<string, unknown> } | null,
  email: string,
): AdminAuth {
  if (!session) return { email, session: null }
  return {
    email: session.user.email as string,
    session: {
      user: {
        id: session.user.id as string,
        name: session.user.name as string,
        email: session.user.email as string,
        role: (session.user.role as string | null) ?? null,
      },
    },
  }
}

const SEED_ADMIN_EMAIL = 'admin@dev.local'

const checkAuth = createServerFn().handler(async (): Promise<AdminAuth> => {
  const auth = getAuth()
  const headers = getRequestHeaders()

  if (import.meta.env.DEV) {
    // Try existing session first (user may have logged in manually)
    const existing = await auth.api.getSession({ headers })
    if (existing) {
      return toAdminAuth(
        existing as { user: Record<string, unknown> },
        existing.user.email,
      )
    }

    // No session — auto-login as seed admin for dev convenience.
    // 1) Send OTP (stores a hash in the verification table; dev mode logs it)
    // 2) Sign in with any OTP (SKIP_OTP_VERIFY bypasses hash comparison)
    // tanstackStartCookies sets the session cookie on the response.
    try {
      await auth.api.sendVerificationOTP({
        headers,
        body: { email: SEED_ADMIN_EMAIL, type: 'sign-in' },
      })
      const result = (await auth.api.signInEmailOTP({
        headers,
        body: { email: SEED_ADMIN_EMAIL, otp: '000000' },
      })) as unknown as {
        token?: string
        user?: Record<string, unknown>
      } | null

      if (result?.token && result?.user) {
        return {
          email: result.user.email as string,
          session: {
            user: {
              id: result.user.id as string,
              name: (result.user.name as string) || 'Admin',
              email: result.user.email as string,
              role: (result.user.role as string | null) ?? null,
            },
          },
        }
      }
    } catch {
      // Auto-login failed (e.g. admin user not seeded yet)
    }

    // Fallback: no admin user in DB yet (pre-seed state)
    return {
      email: 'dev@localhost',
      session: {
        user: {
          id: 'dev',
          name: 'Developer',
          email: 'dev@localhost',
          role: 'admin',
        },
      },
    }
  }

  // Production: CF Access gate
  const identity = await verifyCfAccess(getRequest())
  if (!identity) throw new Error('Unauthorized')

  const session = await auth.api.getSession({ headers })
  return toAdminAuth(
    session as { user: Record<string, unknown> } | null,
    identity.email,
  )
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
