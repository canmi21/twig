/* src/routes/@/_dashboard/users/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
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
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-lg font-medium">Users</h1>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-secondary">No users yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-secondary">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">Email</th>
              <th className="pb-2 font-normal">Role</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Created</th>
              <th className="pb-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border transition-colors hover:bg-raised/50"
              >
                <td className="py-3 font-medium">{user.name}</td>
                <td className="py-3 text-secondary">{user.email}</td>
                <td className="py-3">
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs ${
                      user.role === 'admin'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-raised text-secondary'
                    }`}
                  >
                    {user.role ?? 'user'}
                  </span>
                </td>
                <td className="py-3">
                  {user.banned ? (
                    <span
                      className="rounded-sm bg-danger/10 px-2 py-0.5 text-xs text-danger"
                      title={user.banReason ?? undefined}
                    >
                      Banned
                    </span>
                  ) : (
                    <span className="rounded-sm bg-success/10 px-2 py-0.5 text-xs text-success">
                      Active
                    </span>
                  )}
                </td>
                <td className="py-3 text-secondary">
                  {formatDate(user.createdAt)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {user.banned ? (
                      <button
                        type="button"
                        disabled={loading === user.id}
                        onClick={() => handleUnban(user.id)}
                        className="text-secondary hover:text-primary disabled:opacity-50"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={loading === user.id}
                        onClick={() => handleBan(user.id)}
                        className="text-secondary hover:text-danger disabled:opacity-50"
                      >
                        Ban
                      </button>
                    )}
                    {deleting === user.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={loading === user.id}
                          onClick={() => handleDelete(user.id)}
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
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleting(user.id)}
                        className="text-secondary hover:text-danger"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
