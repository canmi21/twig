/* src/routes/login/verify/index.tsx */

import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { authClient } from '~/lib/auth-client'
import { SITE_TITLE } from '~/lib/content/metadata'

interface VerifySearch {
  email?: string
  code?: string
}

export const Route = createFileRoute('/login/verify/')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    code: search.code != null ? String(search.code) : undefined,
  }),
  component: VerifyPage,
})

function VerifyPage() {
  const { email, code } = Route.useSearch()

  if (!email || !code) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-180 px-5 py-24">
          <div className="mx-auto max-w-72">
            <p className="text-[14px] text-secondary">
              Invalid verification link.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-[13px] text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <VerifyForm email={email} code={code} />
}

function VerifyForm({ email, code }: { email: string; code: string }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      navigate({ to: '/' })
    } catch {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-180 px-5 py-24">
        <div className="mx-auto max-w-72">
          <Link
            to="/"
            className="mb-8 inline-block text-[13px] text-secondary transition-colors hover:text-primary"
          >
            {SITE_TITLE}
          </Link>
          <h1 className="text-[17px] font-medium text-primary">
            Confirm sign in
          </h1>
          <p className="mt-1.5 text-[13px] text-secondary">
            Click the button below to sign in as {email}.
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

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="mt-6 w-full rounded-md bg-primary px-3 py-2 text-[14px] font-medium text-surface transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <Link
            to="/login"
            className="mt-3 block w-full text-center text-[13px] text-secondary transition-colors hover:text-primary"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
