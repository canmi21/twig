/* src/routes/login/index.tsx */

import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { motion, AnimatePresence } from 'motion/react'
import { authClient } from '~/lib/auth-client'
import { SITE_TITLE } from '~/lib/content/metadata'
import { user as userTable } from '~/lib/database/auth-schema'
import { getDb, getPublicUrl } from '~/server/platform'

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
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      navigate({ to: '/' })
    } catch {
      setError('Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-180 px-5 py-24">
      <div className="mx-auto max-w-72">
        <Link
          to="/"
          className="mb-8 inline-block text-[13px] text-secondary transition-colors hover:text-primary"
        >
          {SITE_TITLE}
        </Link>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <h1 className="text-[17px] font-medium text-primary">Sign in</h1>
              <p className="mt-1.5 text-[13px] text-secondary">
                Enter your email to receive a verification code.
              </p>

              <AnimatePresence>
                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="mt-4 text-[13px] text-danger"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendOtp} className="mt-8">
                <label
                  htmlFor="email"
                  className="block text-[13px] font-medium text-primary"
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
                  className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-primary transition-colors outline-none placeholder:text-tertiary focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-[14px] font-medium text-surface transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send code'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <h1 className="text-[17px] font-medium text-primary">Sign in</h1>
              <p className="mt-1.5 text-[13px] text-secondary">
                A code has been sent to {email}.
              </p>

              <AnimatePresence>
                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="mt-4 text-[13px] text-danger"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <form onSubmit={handleVerifyOtp} className="mt-8">
                <label
                  htmlFor="otp"
                  className="block text-[13px] font-medium text-primary"
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
                  className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-center text-[20px] tracking-[0.25em] text-primary transition-colors outline-none placeholder:text-tertiary focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-[14px] font-medium text-surface transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
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
                  className="mt-3 w-full text-[13px] text-secondary transition-colors hover:text-primary"
                >
                  Use a different email
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
