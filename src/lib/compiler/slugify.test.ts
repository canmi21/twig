/* src/lib/compiler/slugify.test.ts */

import { describe, expect, test } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  test('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  test('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz')
  })

  test('replaces underscores with hyphens', () => {
    expect(slugify('foo_bar_baz')).toBe('foo-bar-baz')
  })

  test('strips special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('foo@bar#baz')).toBe('foobarbaz')
  })

  test('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
    expect(slugify('  hello  ')).toBe('hello')
  })

  test('handles mixed latin text', () => {
    expect(slugify('Getting Started with TypeScript')).toBe(
      'getting-started-with-typescript',
    )
  })

  test('strips chinese characters (non-word chars)', () => {
    // \w only matches [a-zA-Z0-9_], so CJK chars are stripped
    expect(slugify('hello world')).toBe('hello-world')
  })

  test('returns empty string for all-special input', () => {
    expect(slugify('!!!')).toBe('')
  })

  test('collapses multiple separators', () => {
    expect(slugify('foo   bar___baz')).toBe('foo-bar-baz')
  })
})
