/* src/components/dev/dev-overlay.tsx */

// Dev-only identity switcher rendered as a fixed overlay on the left
// edge of the viewport. This module is imported from __root.tsx via a
// dynamic `import()` gated by `import.meta.env.DEV`, so the entire
// file — component, server functions, hardcoded seed data — is never
// pulled into the module graph when Vite builds for production.
//
// The buttons drive the real Better Auth OTP flow. SKIP_OTP_VERIFY is
// implicit in dev (see src/server/better-auth.ts), so any OTP value
// passes the hash check. Dev and prod share the same authentication
// code path; the overlay just short-circuits the human-facing OTP
// entry step.

import { useEffect, useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { getAuth } from '~/server/better-auth'
import { getDb } from '~/server/platform'
import { user as userTable } from '~/lib/database/auth-schema'

type DevIdentity = 'admin' | 'alice'

interface DevProfile {
  id: string
  name: string
  email: string
  role: 'admin' | null
}

const DEV_PROFILES: Record<DevIdentity, DevProfile> = {
  admin: {
    id: 'dev-user-admin',
    name: 'Admin',
    email: 'admin@dev.local',
    role: 'admin',
  },
  alice: {
    id: 'dev-user-alice',
    name: 'Alice',
    email: 'alice@dev.local',
    role: null,
  },
}

interface DevSession {
  id: string
  name: string
  email: string
  role: string | null
  expiresAt: string
}

const loadDevSession = createServerFn().handler(
  async (): Promise<DevSession | null> => {
    if (!import.meta.env.DEV) return null
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(),
    })
    if (!session) return null
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: (session.user as { role?: string | null }).role ?? null,
      expiresAt: session.session.expiresAt.toISOString(),
    }
  },
)

const devSignInAs = createServerFn({ method: 'POST' })
  .inputValidator((input: { identity: DevIdentity }) => input)
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) throw new Error('Forbidden')
    const profile = DEV_PROFILES[data.identity]
    if (!profile) throw new Error('Unknown identity')

    // After `just sync-remote` pulls prod data the seed users are
    // gone. Upsert on demand so the overlay works without manual
    // reseeding.
    const db = getDb()
    const existing = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, profile.email))
      .limit(1)
    if (existing.length === 0) {
      await db.insert(userTable).values({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        emailVerified: true,
        role: profile.role,
      })
    }

    const auth = getAuth()
    const headers = getRequestHeaders()
    await auth.api.sendVerificationOTP({
      headers,
      body: { email: profile.email, type: 'sign-in' },
    })
    await auth.api.signInEmailOTP({
      headers,
      body: { email: profile.email, otp: '000000' },
    })

    return { ok: true as const }
  })

const devSignOut = createServerFn({ method: 'POST' }).handler(async () => {
  if (!import.meta.env.DEV) throw new Error('Forbidden')
  await getAuth().api.signOut({ headers: getRequestHeaders() })
  return { ok: true as const }
})

type Busy = DevIdentity | 'signout' | null

export default function DevOverlay() {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<DevSession | null>(null)
  const [busy, setBusy] = useState<Busy>(null)

  useEffect(() => {
    let cancelled = false
    loadDevSession().then((s) => {
      if (!cancelled) setSession(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function refreshSession() {
    const s = await loadDevSession()
    setSession(s)
  }

  async function handleSignInAs(identity: DevIdentity) {
    setBusy(identity)
    try {
      await devSignInAs({ data: { identity } })
      await refreshSession()
      window.location.reload()
    } finally {
      setBusy(null)
    }
  }

  async function handleSignOut() {
    setBusy('signout')
    try {
      await devSignOut()
      await refreshSession()
      window.location.reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-0 flex items-center"
      style={{ zIndex: 2147483647 }}
    >
      <div className="pointer-events-auto flex items-stretch">
        {open ? (
          <div className="flex w-72 flex-col gap-4 rounded-r-md border border-l-0 border-border bg-raised p-4 shadow-lg">
            <header className="flex items-center justify-between">
              <h2 className="text-[13px] font-[560] text-primary">
                Dev Overlay
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[12px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-(--opacity-soft)"
              >
                Hide
              </button>
            </header>

            <section>
              <p className="text-[11px] tracking-wide text-primary uppercase opacity-(--opacity-muted)">
                Session
              </p>
              <div className="mt-2 overflow-hidden rounded-md border border-border">
                {session ? (
                  <dl className="divide-y divide-border text-[12px]">
                    <SessionRow label="Name" value={session.name} />
                    <SessionRow label="Email" value={session.email} />
                    <SessionRow
                      label="Role"
                      value={session.role ?? 'user'}
                      accent={session.role === 'admin'}
                    />
                  </dl>
                ) : (
                  <p className="p-3 text-[12px] text-primary opacity-(--opacity-muted)">
                    Not signed in.
                  </p>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <p className="text-[11px] tracking-wide text-primary uppercase opacity-(--opacity-muted)">
                Switch identity
              </p>
              <IdentityButton
                label="Sign out"
                disabled={busy !== null}
                busy={busy === 'signout'}
                onClick={handleSignOut}
              />
              <IdentityButton
                label="Admin"
                hint="admin@dev.local"
                disabled={busy !== null}
                busy={busy === 'admin'}
                onClick={() => handleSignInAs('admin')}
              />
              <IdentityButton
                label="Alice"
                hint="alice@dev.local"
                disabled={busy !== null}
                busy={busy === 'alice'}
                onClick={() => handleSignInAs('alice')}
              />
            </section>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-24 w-6 items-center justify-center rounded-r-md border border-l-0 border-border bg-raised text-[10px] font-[560] tracking-widest text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
            aria-label="Open dev overlay"
          >
            <span className="[text-orientation:mixed] [writing-mode:vertical-rl]">
              DEV
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function SessionRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <dt className="text-[11px] text-primary opacity-(--opacity-muted)">
        {label}
      </dt>
      <dd
        className={`text-[12px] text-primary ${accent ? 'font-[560]' : 'opacity-(--opacity-soft)'}`}
      >
        {value}
      </dd>
    </div>
  )
}

function IdentityButton({
  label,
  hint,
  disabled,
  busy,
  onClick,
}: {
  label: string
  hint?: string
  disabled: boolean
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-0.5 rounded-md border border-border bg-surface px-3 py-2 text-left transition-opacity duration-140 hover:opacity-(--opacity-muted) disabled:opacity-(--opacity-disabled)"
    >
      <span className="text-[12px] font-[560] text-primary">
        {busy ? 'Switching...' : label}
      </span>
      {hint ? (
        <span className="text-[11px] text-primary opacity-(--opacity-muted)">
          {hint}
        </span>
      ) : null}
    </button>
  )
}
