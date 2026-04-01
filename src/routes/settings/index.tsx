/* src/routes/settings/index.tsx */

import { useState, useRef } from 'react'
import { createFileRoute, Link, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { Undo2 } from 'lucide-react'
import { getAuth } from '~/server/better-auth'
import { getBucket } from '~/server/platform'
import { authClient } from '~/lib/auth-client'
import { ThemeToggle } from '~/components/theme-toggle'

interface Profile {
  id: string
  name: string
  email: string
}

const getProfile = createServerFn().handler(async (): Promise<Profile> => {
  const auth = getAuth()
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })
  if (!session) throw new Error('Unauthorized')
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }
})

const MAX_AVATAR_BYTES = 3 * 1024 * 1024

const uploadAvatar = createServerFn({ method: 'POST' })
  .inputValidator((input: { base64: string; userId?: string }) => input)
  .handler(async ({ data }) => {
    const auth = getAuth()
    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    })
    if (!session) throw new Error('Unauthorized')

    // Admin can upload for other users; regular users only for themselves
    const targetId = data.userId ?? session.user.id
    if (
      targetId !== session.user.id &&
      (session.user as Record<string, unknown>).role !== 'admin'
    ) {
      throw new Error('Forbidden')
    }

    const buf = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
    if (buf.byteLength > MAX_AVATAR_BYTES) {
      throw new Error('Avatar must be under 3MB')
    }

    const key = `avatar/${targetId}.webp`
    const r2 = getBucket()
    await r2.put(key, buf, { httpMetadata: { contentType: 'image/webp' } })

    return { key }
  })

/** Convert an image file to webp base64 (95% quality) in the browser. */
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
          if (!blob) {
            reject(new Error('Failed to convert image'))
            return
          }
          if (blob.size > MAX_AVATAR_BYTES) {
            reject(new Error('Image too large after conversion (max 3MB)'))
            return
          }
          const reader = new FileReader()
          reader.addEventListener('loadend', () => {
            resolve((reader.result as string).split(',')[1])
          })
          reader.addEventListener('error', () =>
            reject(new Error('Failed to read image')),
          )
          reader.readAsDataURL(blob)
        },
        'image/webp',
        0.95,
      )
    })
    img.addEventListener('error', () =>
      reject(new Error('Failed to load image')),
    )
    img.src = URL.createObjectURL(file)
  })
}

function useAvatarSrc(userId: string, bust?: string) {
  const { cdnPublicUrl } = useRouteContext({ from: '__root__' })
  const prefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl
  const base = `${prefix}/avatar/${userId}.webp`
  return bust ? `${base}?t=${bust}` : base
}

export const Route = createFileRoute('/settings/')({
  loader: () => getProfile(),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = Route.useLoaderData()
  const [name, setName] = useState(profile.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarBust, setAvatarBust] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarUrl = useAvatarSrc(profile.id, avatarBust ?? undefined)
  const showAvatar = !avatarError || avatarBust !== null

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === profile.name) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const result = await authClient.updateUser({ name: trimmed })
      if (result.error) {
        setError(result.error.message ?? 'Failed to update name')
        return
      }
      setSaved(true)
    } catch {
      setError('Failed to update name')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Unsupported image format')
      return
    }

    setUploading(true)
    setError(null)
    setSaved(false)
    try {
      const base64 = await imageToWebpBase64(file)
      await uploadAvatar({ data: { base64 } })
      setAvatarError(false)
      setAvatarBust(String(Date.now()))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <Link
        to="/"
        className="absolute top-5 left-5 inline-flex items-center justify-center rounded-full p-2 text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100"
      >
        <Undo2 className="size-4" strokeWidth={2.25} />
      </Link>
      <ThemeToggle />

      <div className="mx-auto flex max-w-3xl gap-12 px-8 pt-24 pb-16">
        {/* Left: profile card */}
        <div className="flex w-56 shrink-0 flex-col items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative size-36 cursor-pointer overflow-hidden rounded-full border border-border bg-raised disabled:opacity-(--opacity-disabled)"
          >
            {showAvatar ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="size-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="flex size-full items-center justify-center text-[40px] font-[560] text-primary opacity-(--opacity-faint)">
                {(profile.name?.[0] ?? profile.email[0]).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-primary/30 text-[12px] font-[560] text-surface opacity-0 transition-opacity duration-140 group-hover:opacity-100">
              {uploading ? 'Uploading...' : 'Change'}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />

          <h1 className="mt-4 text-center text-[17px] font-[560] tracking-[-0.015em] text-primary">
            {profile.name || 'Unnamed'}
          </h1>
          <p className="mt-1 text-center text-[13px] text-primary opacity-(--opacity-muted)">
            {profile.email}
          </p>

          <Link
            to="/logout"
            className="mt-6 text-[13px] text-primary opacity-(--opacity-faint) transition-opacity duration-140 hover:opacity-100"
          >
            Sign out
          </Link>
        </div>

        {/* Right: settings */}
        <div className="min-w-0 flex-1 pt-2">
          <h2 className="text-[15px] font-[560] text-primary">Profile</h2>

          {error && (
            <p className="mt-3 text-[13px] leading-relaxed text-error">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="mt-3 text-[13px] leading-relaxed text-primary opacity-(--opacity-muted)">
              Saved.
            </p>
          )}

          <form onSubmit={handleSaveName} className="mt-5">
            <label
              htmlFor="display-name"
              className="block text-[13px] font-[560] text-primary"
            >
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              required
              maxLength={50}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSaved(false)
              }}
              className="mt-1.5 w-full max-w-72 rounded-sm border border-border bg-raised px-3 py-2 text-[14px] text-primary outline-none placeholder:text-primary placeholder:opacity-(--opacity-faint) focus:border-focus"
            />
            <div className="mt-4">
              <button
                type="submit"
                disabled={
                  saving || !name.trim() || name.trim() === profile.name
                }
                className="rounded-sm bg-primary px-4 py-2 text-[14px] font-[560] text-surface disabled:opacity-(--opacity-disabled)"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-[15px] font-[560] text-primary">Email</h2>
            <p className="mt-2 text-[14px] text-primary opacity-(--opacity-muted)">
              {profile.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
