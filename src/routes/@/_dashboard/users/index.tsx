/* src/routes/@/_dashboard/users/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { motion, AnimatePresence } from 'motion/react'
import { getAuth } from '~/server/better-auth'

interface UserRow {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  createdAt: string
}

const listUsers = createServerFn().handler(async (): Promise<UserRow[]> => {
  const auth = getAuth()
  const headers = getRequestHeaders()
  const result = await auth.api.listUsers({
    headers,
    query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
  })
  return (result as unknown as { users: Record<string, unknown>[] }).users.map(
    (u) => ({
      id: u.id as string,
      name: u.name as string,
      email: u.email as string,
      role: (u.role as string | null) ?? null,
      banned: (u.banned as boolean | null) ?? false,
      banReason: (u.banReason as string | null) ?? null,
      createdAt: String(u.createdAt),
    }),
  )
})

const banUser = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const auth = getAuth()
    await auth.api.banUser({
      headers: getRequestHeaders(),
      body: { userId: data.userId },
    })
  })

const unbanUser = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const auth = getAuth()
    await auth.api.unbanUser({
      headers: getRequestHeaders(),
      body: { userId: data.userId },
    })
  })

const removeUser = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const auth = getAuth()
    await auth.api.removeUser({
      headers: getRequestHeaders(),
      body: { userId: data.userId },
    })
  })

export const Route = createFileRoute('/@/_dashboard/users/')({
  loader: () => listUsers(),
  component: UsersList,
})

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function UsersList() {
  const users = Route.useLoaderData()
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleBan(userId: string) {
    setLoading(userId)
    await banUser({ data: { userId } })
    setLoading(null)
    router.invalidate()
  }

  async function handleUnban(userId: string) {
    setLoading(userId)
    await unbanUser({ data: { userId } })
    setLoading(null)
    router.invalidate()
  }

  async function handleDelete(userId: string) {
    setLoading(userId)
    await removeUser({ data: { userId } })
    setDeleting(null)
    setLoading(null)
    router.invalidate()
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <h1 className="text-[17px] font-medium">Users</h1>
        <p className="mt-1 text-[13px] text-secondary">{users.length} total</p>
      </motion.div>

      {users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-16 text-center"
        >
          <p className="text-[14px] text-secondary">No users yet.</p>
        </motion.div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-boundary text-left text-secondary">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">Email</th>
              <th className="pb-2 font-normal">Role</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Created</th>
              <th className="pb-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="border-b border-boundary transition-colors hover:bg-muted/50"
              >
                <td className="py-3 text-[14px] font-medium">{u.name}</td>
                <td className="py-3 text-[13px] text-secondary">{u.email}</td>
                <td className="py-3">
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs ${
                      u.role === 'admin'
                        ? 'bg-accent-subtle text-accent'
                        : 'bg-muted text-secondary'
                    }`}
                  >
                    {u.role ?? 'user'}
                  </span>
                </td>
                <td className="py-3">
                  <AnimatePresence mode="wait">
                    {u.banned ? (
                      <motion.span
                        key="banned"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-sm bg-danger-subtle px-2 py-0.5 text-xs text-danger"
                        title={u.banReason ?? undefined}
                      >
                        Banned
                      </motion.span>
                    ) : (
                      <motion.span
                        key="active"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-sm bg-success-subtle px-2 py-0.5 text-xs text-success"
                      >
                        Active
                      </motion.span>
                    )}
                  </AnimatePresence>
                </td>
                <td className="py-3 text-[13px] text-secondary">
                  {formatDate(u.createdAt)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {u.banned ? (
                      <button
                        type="button"
                        disabled={loading === u.id}
                        onClick={() => handleUnban(u.id)}
                        className="text-secondary transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={loading === u.id}
                        onClick={() => handleBan(u.id)}
                        className="text-secondary transition-colors hover:text-danger disabled:opacity-50"
                      >
                        Ban
                      </button>
                    )}
                    <AnimatePresence mode="wait">
                      {deleting === u.id ? (
                        <motion.span
                          key="confirm"
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          <button
                            type="button"
                            disabled={loading === u.id}
                            onClick={() => handleDelete(u.id)}
                            className="text-danger disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(null)}
                            className="text-secondary"
                          >
                            Cancel
                          </button>
                        </motion.span>
                      ) : (
                        <motion.button
                          key="delete"
                          type="button"
                          onClick={() => setDeleting(u.id)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-secondary transition-colors hover:text-danger"
                        >
                          Delete
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
