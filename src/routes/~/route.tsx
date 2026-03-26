/* src/routes/~/route.tsx */

import { Outlet, Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { verifyCfAccess } from '~/server/auth'

const checkAuth = createServerFn().handler(async () => {
  if (import.meta.env.DEV) return { email: 'dev@localhost' }

  const identity = await verifyCfAccess(getRequest())
  if (!identity) throw new Error('Unauthorized')
  return { email: identity.email }
})

export const Route = createFileRoute('/~')({
  beforeLoad: async () => {
    try {
      const user = await checkAuth()
      return { user }
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
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="mx-auto max-w-240 px-6 py-8">
      <nav className="mb-8 flex items-center gap-6 border-b border-border pb-4">
        <Link to="/~" className="text-sm font-medium text-primary">
          Console
        </Link>
        <Link
          to="/~/contents"
          className="text-sm text-secondary hover:text-primary"
          activeProps={{ className: 'text-sm text-primary font-medium' }}
        >
          Contents
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
