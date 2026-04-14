/* src/lib/utils/date.ts */

/** Long-form date pinned to a specific IANA timezone: "April 3, 2026". */
export function formatDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  })
}

/** Short-form date pinned to a specific IANA timezone: "Apr 3, 2026". */
export function formatDateShort(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  })
}

/** Relative time: "just now", "5m ago", "3h ago", "7d ago", then falls back to short date.
 *  The fallback formats with the supplied timezone so SSR and client agree on the date string. */
export function timeAgo(iso: string, timeZone: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  })
}
