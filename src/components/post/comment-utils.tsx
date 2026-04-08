/* src/components/post/comment-utils.tsx */

/* src/components/post/comment-utils.tsx
 *
 * Shared utilities and components for the comment section:
 * avatar rendering, comment type, location formatting, and UA parsing.
 */

import { useState } from 'react'
import { useRouteContext } from '@tanstack/react-router'

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  '#DCE7F8',
  '#EFD9CF',
  '#DDEBD7',
  '#E8DDF6',
  '#EFE4C9',
  '#DCE8E4',
] as const

function getAvatarColor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function useAvatarUrl(userId: string) {
  const { cdnPublicUrl } = useRouteContext({ from: '__root__' })
  const prefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl
  return `${prefix}/avatar/${userId}.webp`
}

/* eslint-disable better-tailwindcss/no-unknown-classes */
export function CommentAvatar({
  seed,
  userId,
  nested,
}: {
  seed: string
  userId: string
  nested?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const src = useAvatarUrl(userId)

  return (
    <span
      aria-hidden="true"
      className={`${nested ? 'comments__avatar comments__avatar--nested' : 'comments__avatar'} shrink-0 overflow-hidden rounded-full`}
      style={{ backgroundColor: getAvatarColor(seed) }}
    >
      {!imgError && (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </span>
  )
}
/* eslint-enable better-tailwindcss/no-unknown-classes */

// ---------------------------------------------------------------------------
// Comment type
// ---------------------------------------------------------------------------

export interface Comment {
  id: string
  content: string
  createdAt: string
  parentId: string | null
  userId: string
  userName: string
  userEmail: string
  userAgent: string
  location: string
}

// ---------------------------------------------------------------------------
// Location formatting
// ---------------------------------------------------------------------------

export function formatCommentLocation(location: string): string | null {
  const trimmed = location.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2 && parts[0] === parts.at(-1)) {
    return parts[0]
  }

  return trimmed
}

// ---------------------------------------------------------------------------
// User agent parsing
// ---------------------------------------------------------------------------

export function getClientLabel(userAgent: string): {
  device: 'desktop' | 'portable'
  label: string
} | null {
  const ua = userAgent.trim()
  if (!ua) return null

  const lower = ua.toLowerCase()
  const isTablet = /ipad|tablet/.test(lower)
  const isMobile = /iphone|android|mobile/.test(lower)
  const device: 'desktop' | 'portable' =
    isTablet || isMobile ? 'portable' : 'desktop'

  let browser = 'Browser'
  if (lower.includes('edg/')) {
    browser = 'Edge'
  } else if (lower.includes('opr/') || lower.includes('opera')) {
    browser = 'Opera'
  } else if (lower.includes('firefox') || lower.includes('fxios')) {
    browser = 'Firefox'
  } else if (lower.includes('crios') || lower.includes('chrome')) {
    browser = 'Chrome'
  } else if (lower.includes('safari')) {
    browser = 'Safari'
  }

  let os = ''
  if (/iphone|ipad|cpu iphone os|cpu os/.test(lower)) {
    os = 'iOS'
  } else if (lower.includes('android')) {
    os = 'Android'
  } else if (lower.includes('mac os x') || lower.includes('macintosh')) {
    os = 'MacOS'
  } else if (lower.includes('windows')) {
    os = 'Windows'
  } else if (lower.includes('linux')) {
    os = 'Linux'
  }

  if (device === 'portable') {
    if (os === 'iOS') return { device, label: `iOS ${browser}` }
    if (os === 'Android') return { device, label: `Android ${browser}` }
    return {
      device,
      label: isTablet ? `Tablet ${browser}` : `Mobile ${browser}`,
    }
  }

  if (os === 'MacOS') return { device, label: `MacOS ${browser}` }
  return { device, label: `Desktop ${browser}` }
}
