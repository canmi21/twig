/* src/lib/utils/hash.ts */

import { createHash } from 'node:crypto'

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
}
