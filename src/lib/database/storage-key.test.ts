/* src/lib/database/storage-key.test.ts */

import { describe, expect, test } from 'vitest'
import { storageKey } from './storage-key'

const hash = 'a'.repeat(64)

describe('storageKey', () => {
  test.each([
    ['webp', 'image'],
    ['png', 'image'],
    ['jpg', 'image'],
    ['jpeg', 'image'],
    ['gif', 'image'],
    ['svg', 'image'],
    ['avif', 'image'],
  ])('%s maps to image/', (ext, dir) => {
    expect(storageKey(hash, ext)).toBe(`${dir}/${hash}.${ext}`)
  })

  test.each([
    ['mp4', 'video'],
    ['webm', 'video'],
    ['mov', 'video'],
  ])('%s maps to video/', (ext, dir) => {
    expect(storageKey(hash, ext)).toBe(`${dir}/${hash}.${ext}`)
  })

  test.each([
    ['mp3', 'audio'],
    ['wav', 'audio'],
    ['ogg', 'audio'],
    ['flac', 'audio'],
  ])('%s maps to audio/', (ext, dir) => {
    expect(storageKey(hash, ext)).toBe(`${dir}/${hash}.${ext}`)
  })

  test('unknown ext falls back to media/', () => {
    expect(storageKey(hash, 'zip')).toBe(`media/${hash}.zip`)
    expect(storageKey(hash, 'pdf')).toBe(`media/${hash}.pdf`)
  })

  test('returns {type}/{hash}.{ext} format', () => {
    const result = storageKey('abc123', 'png')
    expect(result).toBe('image/abc123.png')
  })
})
