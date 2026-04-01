/* src/routes/login/verify/index.tsx */

import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'

interface VerifySearch {
  email?: string
  code?: string
  callback?: string
}

export const Route = createFileRoute('/login/verify/')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    code: search.code != null ? String(search.code) : undefined,
    callback: typeof search.callback === 'string' ? search.callback : undefined,
  }),
  component: VerifyPage,
})

function VerifyPage() {
  const { email, code, callback } = Route.useSearch()

  if (!email || !code) {
    return (
      <div className="mx-auto max-w-180 px-5 py-24">
        <div className="mx-auto max-w-72">
          <p className="text-[14px] text-primary opacity-(--opacity-muted)">
            Invalid verification link.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return <VerifyForm email={email} code={code} callback={callback} />
}

function VerifyForm({
  email,
  code,
  callback,
}: {
  email: string
  code: string
  callback?: string
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = callback ?? '/'

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp: code,
      })
      if (result.error) {
        setError(result.error.message ?? 'Verification failed')
        return
      }
      navigate({ to: redirectTo })
    } catch {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-180 px-5 py-24">
      <div className="mx-auto max-w-72">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          Confirm sign in
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-primary opacity-(--opacity-muted)">
          Click the button below to sign in as {email}.
        </p>

        {error && (
          <p className="mt-4 text-[13px] leading-relaxed text-error">{error}</p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="mt-6 w-full rounded-sm bg-primary px-3 py-2 text-[14px] font-[560] text-surface disabled:opacity-(--opacity-disabled)"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <Link
          to="/login"
          className="mt-3 block w-full text-center text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
