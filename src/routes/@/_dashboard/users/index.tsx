/* src/routes/@/_dashboard/users/index.tsx */

import { useState, useRef } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { getAuth } from '~/server/better-auth'
import { getDb, getBucket } from '~/server/platform'
import { user as userTable } from '~/lib/database/auth-schema'
import { formatDateShort } from '~/lib/utils/date'

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
    (user) => ({
      id: user.id as string,
      name: user.name as string,
      email: user.email as string,
      role: (user.role as string | null) ?? null,
      banned: (user.banned as boolean | null) ?? false,
      banReason: (user.banReason as string | null) ?? null,
      createdAt: String(user.createdAt),
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

const updateUserAdmin = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { userId: string; name?: string; role?: string }) => input,
  )
  .handler(async ({ data }) => {
    const auth = getAuth()
    if (data.role !== undefined) {
      await auth.api.setRole({
        headers: getRequestHeaders(),
        body: {
          userId: data.userId,
          role: (data.role ?? 'user') as 'user' | 'admin',
        },
      })
    }
    if (data.name !== undefined) {
      const db = getDb()
      await db
        .update(userTable)
        .set({ name: data.name })
        .where(eq(userTable.id, data.userId))
    }
  })

const adminUploadAvatar = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string; base64: string }) => input)
  .handler(async ({ data }) => {
    const buf = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
    if (buf.byteLength > 3 * 1024 * 1024) {
      throw new Error('Avatar must be under 3MB')
    }
    const key = `avatar/${data.userId}.webp`
    await getBucket().put(key, buf, {
      httpMetadata: { contentType: 'image/webp' },
    })
  })

export const Route = createFileRoute('/@/_dashboard/users/')({
  loader: () => listUsers(),
  component: UsersList,
})

function formatUserDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return formatDateShort(value)
}

interface EditState {
  userId: string
  name: string
  role: string
}

function imageToWebpBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')?.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Conversion failed'))
          if (blob.size > 3 * 1024 * 1024)
            return reject(new Error('Image too large (max 3MB)'))
          const reader = new FileReader()
          reader.addEventListener('loadend', () =>
            resolve((reader.result as string).split(',')[1]),
          )
          reader.addEventListener('error', () =>
            reject(new Error('Read failed')),
          )
          reader.readAsDataURL(blob)
        },
        'image/webp',
        0.95,
      )
    })
    img.addEventListener('error', () => reject(new Error('Load failed')))
    img.src = URL.createObjectURL(file)
  })
}

function UsersList() {
  const users = Route.useLoaderData()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditState | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const [avatarTarget, setAvatarTarget] = useState<string | null>(null)

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
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    setLoading(userId)
    await removeUser({ data: { userId } })
    setLoading(null)
    router.invalidate()
  }

  function startEdit(user: UserRow) {
    setEditing({
      userId: user.id,
      name: user.name,
      role: user.role ?? 'user',
    })
  }

  async function handleSaveEdit() {
    if (!editing) return
    setLoading(editing.userId)
    await updateUserAdmin({
      data: {
        userId: editing.userId,
        name: editing.name,
        role: editing.role,
      },
    })
    setEditing(null)
    setLoading(null)
    router.invalidate()
  }

  function triggerAvatarUpload(userId: string) {
    setAvatarTarget(userId)
    avatarRef.current?.click()
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !avatarTarget || !file.type.startsWith('image/')) return
    setLoading(avatarTarget)
    try {
      const base64 = await imageToWebpBase64(file)
      await adminUploadAvatar({ data: { userId: avatarTarget, base64 } })
      router.invalidate()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(null)
      setAvatarTarget(null)
      e.target.value = ''
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          Users
        </h1>
      </div>

      <input
        ref={avatarRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFile}
        className="hidden"
      />

      {users.length === 0 ? (
        <p className="text-[14px] text-primary opacity-(--opacity-muted)">
          No users yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border bg-raised">
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Role
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-[560] text-primary">
                  Created
                </th>
                <th className="px-4 py-2.5 text-right text-[12px] font-[560] text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editing?.userId === user.id
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editing.name}
                          onChange={(e) =>
                            setEditing({ ...editing, name: e.target.value })
                          }
                          className="w-full rounded-sm border border-border bg-raised px-2 py-1 text-[13px] text-primary outline-none focus:border-focus"
                        />
                      ) : (
                        <span className="text-[14px] font-[560] text-primary">
                          {user.name || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-primary opacity-(--opacity-muted)">
                        {user.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editing.role}
                          onChange={(e) =>
                            setEditing({ ...editing, role: e.target.value })
                          }
                          className="rounded-sm border border-border bg-raised px-2 py-1 text-[12px] text-primary outline-none focus:border-focus"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[12px] text-primary ${
                            user.role === 'admin'
                              ? 'font-[560]'
                              : 'opacity-(--opacity-muted)'
                          }`}
                        >
                          {user.role ?? 'user'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.banned ? (
                        <span
                          className="text-[12px] text-primary line-through opacity-(--opacity-faint)"
                          title={user.banReason ?? undefined}
                        >
                          Banned
                        </span>
                      ) : (
                        <span className="text-[12px] text-primary opacity-(--opacity-soft)">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-primary opacity-(--opacity-muted)">
                      {formatUserDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={loading === user.id}
                              onClick={handleSaveEdit}
                              className="text-[13px] text-primary transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={loading === user.id}
                              onClick={() => triggerAvatarUpload(user.id)}
                              className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                            >
                              Avatar
                            </button>
                            {user.banned ? (
                              <button
                                type="button"
                                disabled={loading === user.id}
                                onClick={() => handleUnban(user.id)}
                                className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={loading === user.id}
                                onClick={() => handleBan(user.id)}
                                className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                              >
                                Ban
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={loading === user.id}
                              onClick={() => handleDelete(user.id)}
                              className="text-[13px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:opacity-(--opacity-disabled)"
                            >
                              Delete
                            </button>
                          </>
                        )}
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
