/* src/routes/logout/index.tsx */

import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Undo2 } from 'lucide-react'
import { authClient } from '~/lib/auth-client'
import { ThemeToggle } from '~/components/theme-toggle'

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
      <div className="relative flex min-h-screen items-center justify-center px-5">
        <Link
          to="/"
          className="absolute top-5 left-5 inline-flex items-center justify-center rounded-full p-2 text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
        >
          <Undo2 className="size-4" strokeWidth={2.25} />
        </Link>
        <ThemeToggle />
        <div className="max-w-72 text-center">
          <p className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
            Signed out
          </p>
          <Link
            to="/"
            className="mt-4 inline-block text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
          >
            Back to site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <div className="max-w-72 text-center">
        <p className="text-[15px] text-primary">Sign out of your account?</p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="mt-4 rounded-sm bg-primary px-4 py-2 text-[14px] font-[560] text-surface disabled:opacity-(--opacity-disabled)"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
