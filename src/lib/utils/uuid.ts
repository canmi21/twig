/* src/lib/utils/uuid.ts */

import { v7 } from 'uuid'

/** Generate a UUIDv7 from a timestamp, returned as 32-char hex (no dashes). */
export function cid(msecs: number): string {
  return v7({ msecs }).replaceAll('-', '')
}

/** Generate a UUIDv7 from the current time. */
export function newCid(): string {
  return cid(Date.now())
}
