/* src/lib/utils/__tests__/mime.test.ts */

import { describe, expect, test } from 'vitest'
import { mimeFromExt } from '../mime'

describe('mimeFromExt', () => {
  test.each([
    ['webp', 'image/webp'],
    ['png', 'image/png'],
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['gif', 'image/gif'],
    ['svg', 'image/svg+xml'],
    ['avif', 'image/avif'],
    ['mp4', 'video/mp4'],
    ['webm', 'video/webm'],
    ['mov', 'video/quicktime'],
    ['mp3', 'audio/mpeg'],
    ['wav', 'audio/wav'],
    ['ogg', 'audio/ogg'],
    ['flac', 'audio/flac'],
    ['pdf', 'application/pdf'],
  ])('%s returns %s', (ext, mime) => {
    expect(mimeFromExt(ext)).toBe(mime)
  })

  test('unknown ext returns application/octet-stream', () => {
    expect(mimeFromExt('xyz')).toBe('application/octet-stream')
    expect(mimeFromExt('zip')).toBe('application/octet-stream')
  })

  test('handles uppercase input', () => {
    expect(mimeFromExt('PNG')).toBe('image/png')
    expect(mimeFromExt('MP4')).toBe('video/mp4')
  })
})
