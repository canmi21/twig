/* src/lib/storage/media-url.ts */

import { storageKey } from './storage-key'

/** Build a full media URL from a CDN prefix and a `hash.ext` source string. */
export function mediaUrl(cdnPrefix: string, src: string): string {
  const dotIdx = src.lastIndexOf('.')
  if (dotIdx === -1) return src

  const hash = src.slice(0, dotIdx)
  const ext = src.slice(dotIdx + 1)
  return `${cdnPrefix}/${storageKey(hash, ext)}`
}
