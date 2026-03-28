/* src/routes/logout/index.tsx */

import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { authClient } from '~/lib/auth-client'
import { SITE_TITLE } from '~/lib/content/metadata'

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

  return (
    <div className="mx-auto max-w-180 px-5 py-24">
      <div className="mx-auto max-w-72 text-center">
        <p className="mb-8 text-[12px] text-tertiary">{SITE_TITLE}</p>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-[15px] font-medium text-primary">Signed out</p>
              <Link
                to="/"
                className="mt-4 inline-block text-[13px] text-secondary transition-colors hover:text-primary"
              >
                Back to site
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-[15px] text-primary">
                Sign out of your account?
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-[14px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Signing out...' : 'Sign out'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
