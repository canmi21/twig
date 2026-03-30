/* src/routes/@/_dashboard/users/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { ShieldBan, ShieldCheck, Trash2, Loader2 } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { getAuth } from '~/server/better-auth'

/* ── Types ────────────────────────────────────── */

interface UserRow {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  createdAt: string
}

/* ── Server functions ─────────────────────────── */

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

/* ── Route ────────────────────────────────────── */

export const Route = createFileRoute('/@/_dashboard/users/')({
  loader: () => listUsers(),
  component: UsersPage,
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

/* ── Delete dialog ────────────────────────────── */

function DeleteUserDialog({
  name,
  email,
  onConfirm,
}: {
  name: string
  email: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-error-light hover:text-geist-error"
          title="Delete"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-1/2 rounded-lg bg-geist-bg p-6 shadow-geist-md">
          <AlertDialog.Title className="text-[15px] font-semibold text-geist-1000">
            Delete user
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-geist-900">
            Permanently delete {name} ({email})? This cannot be undone.
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel className="h-8 rounded-md border border-geist-400 bg-geist-bg px-3 text-[13px] font-medium text-geist-1000 transition-colors hover:bg-geist-100">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className="h-8 rounded-md bg-geist-error px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Delete
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

/* ── Component ────────────────────────────────── */

function UsersPage() {
  const users = Route.useLoaderData()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function handleBan(userId: string) {
    setBusy(userId)
    await banUser({ data: { userId } })
    setBusy(null)
    router.invalidate()
  }

  async function handleUnban(userId: string) {
    setBusy(userId)
    await unbanUser({ data: { userId } })
    setBusy(null)
    router.invalidate()
  }

  async function handleDelete(userId: string) {
    setBusy(userId)
    await removeUser({ data: { userId } })
    setBusy(null)
    router.invalidate()
  }

  const admins = users.filter((u) => u.role === 'admin').length
  const banned = users.filter((u) => u.banned).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-geist-1000">Users</h1>
        <p className="mt-0.5 text-[12px] text-geist-600">
          {users.length} total &middot; {admins} admin
          {admins !== 1 ? 's' : ''} &middot; {banned} banned
        </p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-geist-400 py-16 text-center">
          <p className="text-[13px] font-medium text-geist-900">No users yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-geist-bg-2 shadow-geist-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-geist-200 bg-geist-100 text-left">
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  User
                </th>
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Role
                </th>
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-[11px] font-medium tracking-wider text-geist-600 uppercase">
                  Joined
                </th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isBusy = busy === u.id
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-geist-200 transition-colors last:border-0 hover:bg-geist-100/50 ${isBusy ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-geist-200 text-[11px] font-semibold text-geist-700">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-geist-1000">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-geist-600">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${u.role === 'admin' ? 'bg-geist-1000 text-geist-bg' : 'bg-geist-100 text-geist-600'}`}
                      >
                        {u.role ?? 'user'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.banned ? (
                        <span
                          className="rounded-sm bg-geist-error-light px-1.5 py-0.5 text-[11px] font-medium text-geist-error-dark"
                          title={u.banReason ?? undefined}
                        >
                          Banned
                        </span>
                      ) : (
                        <span className="rounded-sm bg-geist-success-light px-1.5 py-0.5 text-[11px] font-medium text-geist-success-dark">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="geist-mono px-3 py-2.5 text-[12px] whitespace-nowrap text-geist-600 tabular-nums">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {u.banned ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUnban(u.id)}
                            className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-success-light hover:text-geist-success disabled:opacity-40"
                            title="Unban"
                          >
                            {isBusy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <ShieldCheck size={14} strokeWidth={1.5} />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleBan(u.id)}
                            className="inline-flex size-7 items-center justify-center rounded-md text-geist-600 transition-colors hover:bg-geist-error-light hover:text-geist-error disabled:opacity-40"
                            title="Ban"
                          >
                            {isBusy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <ShieldBan size={14} strokeWidth={1.5} />
                            )}
                          </button>
                        )}
                        <DeleteUserDialog
                          name={u.name}
                          email={u.email}
                          onConfirm={() => handleDelete(u.id)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
