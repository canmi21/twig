/* src/lib/utils/__tests__/uuid.test.ts */

import { describe, expect, test } from 'vitest'
import { cid, newCid } from '../uuid'

describe('cid', () => {
  test('returns a 32-char hex string', () => {
    const result = cid(Date.now())
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[0-9a-f]{32}$/)
  })

  test('contains no dashes', () => {
    const result = cid(Date.now())
    expect(result).not.toContain('-')
  })

  test('deterministic for same timestamp produces valid format', () => {
    const ts = 1700000000000
    const a = cid(ts)
    const b = cid(ts)
    // Both are valid 32-char hex (random part may differ per UUIDv7 spec)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(b).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('newCid', () => {
  test('returns a 32-char hex string', () => {
    const result = newCid()
    expect(result).toHaveLength(32)
    expect(result).toMatch(/^[0-9a-f]{32}$/)
  })

  test('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newCid()))
    expect(ids.size).toBe(100)
  })
})
