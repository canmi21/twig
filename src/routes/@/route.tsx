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

function toAdminAuth(
  session: { user: Record<string, unknown> } | null,
): AdminAuth {
  if (!session) return { session: null }
  return {
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

// Auth model: Better Auth is the single source of truth. In production,
// the admin signs in via the email OTP flow and the resulting session
// cookie is what gates every admin mutation (see src/server/admin-guard.ts
// for the per-server-function check). CF Access, if configured, sits at
// the Cloudflare edge as a pure network gate and never reaches this
// code — it does not participate in the application-layer identity
// model. Dev bootstraps a seed admin so the dashboard is usable
// without manually signing in on every restart.
const checkAuth = createServerFn().handler(async (): Promise<AdminAuth> => {
  const auth = getAuth()
  const headers = getRequestHeaders()

  // Try the existing session first. Applies to both dev and prod —
  // a user who already signed in should not trigger any fallback.
  const existing = await auth.api.getSession({ headers })
  if (existing) {
    return toAdminAuth(existing as { user: Record<string, unknown> })
  }

  if (import.meta.env.DEV) {
    // Dev auto-login as the seed admin. SKIP_OTP_VERIFY lets the OTP
    // hash check pass with any code; tanstackStartCookies writes the
    // session cookie onto the response.
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

    // Fallback: no admin user in DB yet (pre-seed state). The fake
    // identity lets the dashboard render so the operator can run
    // `just db-seed` from inside it without bootstrapping issues.
    return {
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

  // Prod without a session: AdminGate renders the sign-in prompt.
  return { session: null }
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
