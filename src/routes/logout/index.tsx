/* src/routes/logout/index.tsx */

import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/logout/')({
  component: LogoutPage,
})

function LogoutPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await authClient.signOut()
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-180 px-5 py-24">
        <div className="mx-auto max-w-72 text-center">
          <p className="text-[15px] font-medium text-primary">Signed out</p>
          <Link
            to="/"
            className="mt-4 inline-block text-[13px] text-secondary hover:text-primary"
          >
            Back to site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-180 px-5 py-24">
      <div className="mx-auto max-w-72 text-center">
        <p className="text-[15px] text-primary">Sign out of your account?</p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-[14px] font-medium text-surface disabled:opacity-50"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
