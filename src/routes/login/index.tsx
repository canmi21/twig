/* src/routes/login/index.tsx */

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'

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
        <h1 className="text-[17px] font-medium text-primary">Sign in</h1>
        <p className="mt-1.5 text-[13px] text-secondary">
          {step === 'email'
            ? 'Enter your email to receive a verification code.'
            : `A code has been sent to ${email}.`}
        </p>

        {error && (
          <p className="mt-4 text-[13px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="mt-6">
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
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-primary outline-none placeholder:text-tertiary focus:border-secondary"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-[14px] font-medium text-surface disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6">
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
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-center text-[20px] tracking-[0.25em] text-primary outline-none placeholder:text-tertiary focus:border-secondary"
            />
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-[14px] font-medium text-surface disabled:opacity-50"
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
              className="mt-3 w-full text-[13px] text-secondary hover:text-primary"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
