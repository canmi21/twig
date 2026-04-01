/* src/routes/login/index.tsx */

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { authClient } from '~/lib/auth-client'
import { user as userTable } from '~/lib/database/auth-schema'
import { getDb, getPublicUrl } from '~/server/platform'

interface LoginSearch {
  callback?: string
}

const checkBanned = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const [row] = await getDb()
      .select({ banned: userTable.banned })
      .from(userTable)
      .where(eq(userTable.email, data.email))
      .limit(1)
    if (row?.banned) {
      const domain = getPublicUrl().replace(/^https?:\/\//, '')
      return {
        banned: true as const,
        message: `This account has been suspended. If you believe this is a mistake, contact support@${domain}`,
      }
    }
    return { banned: false as const }
  })

export const Route = createFileRoute('/login/')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    callback: typeof search.callback === 'string' ? search.callback : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { callback } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = callback ?? '/'

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const ban = await checkBanned({ data: { email } })
      if (ban.banned) {
        setError(ban.message)
        return
      }
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      })
      if (result.error) {
        setError(result.error.message ?? 'Failed to send code')
        return
      }
      setStep('otp')
    } catch {
      setError('Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.signIn.emailOtp({ email, otp })
      if (result.error) {
        setError(result.error.message ?? 'Invalid code')
        return
      }
      navigate({ to: redirectTo })
    } catch {
      setError('Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-180 px-5 py-24">
      <div className="mx-auto max-w-72">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          Sign in
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-primary opacity-(--opacity-muted)">
          {step === 'email'
            ? 'Enter your email to receive a verification code.'
            : `A code has been sent to ${email}.`}
        </p>

        {error && (
          <p className="mt-4 text-[13px] leading-relaxed text-error">{error}</p>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="mt-6">
            <label
              htmlFor="email"
              className="block text-[13px] font-[560] text-primary"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-sm border border-border bg-raised px-3 py-2 text-[14px] text-primary outline-none placeholder:text-primary placeholder:opacity-(--opacity-faint) focus:border-focus"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-sm bg-primary px-3 py-2 text-[14px] font-[560] text-surface disabled:opacity-(--opacity-disabled)"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6">
            <label
              htmlFor="otp"
              className="block text-[13px] font-[560] text-primary"
            >
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              className="mt-1.5 w-full rounded-sm border border-border bg-raised px-3 py-2 text-center text-[20px] tracking-[0.25em] text-primary outline-none placeholder:text-primary placeholder:opacity-(--opacity-faint) focus:border-focus"
            />
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="mt-4 w-full rounded-sm bg-primary px-3 py-2 text-[14px] font-[560] text-surface disabled:opacity-(--opacity-disabled)"
            >
              {loading ? 'Verifying...' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError(null)
              }}
              className="mt-3 w-full text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
