/* src/lib/compiler/__tests__/frontmatter.test.ts */

import { describe, expect, test } from 'vitest'
import { serializeFrontmatter } from '../frontmatter'

describe('serializeFrontmatter', () => {
  test('serializes all fields in correct order', () => {
    const result = serializeFrontmatter({
      cid: 'a'.repeat(32),
      title: 'Hello',
      description: 'A post',
      category: 'dev',
      tags: ['ts', 'node'],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      published: true,
    })

    const lines = result.split('\n')
    // cid first, then title, then metadata last
    expect(lines[0]).toBe('---')
    expect(lines[1]).toMatch(/^cid:/)
    expect(lines[2]).toMatch(/^title:/)
    expect(lines[3]).toMatch(/^description:/)
    expect(lines[4]).toMatch(/^category:/)
    // tags array occupies multiple lines
    const joined = result
    expect(joined.indexOf('cid:')).toBeLessThan(joined.indexOf('title:'))
    expect(joined.indexOf('title:')).toBeLessThan(joined.indexOf('created_at:'))
    expect(joined.indexOf('created_at:')).toBeLessThan(
      joined.indexOf('updated_at:'),
    )
    expect(joined.indexOf('updated_at:')).toBeLessThan(
      joined.indexOf('published:'),
    )
  })

  test('omits undefined/null optional fields', () => {
    const result = serializeFrontmatter({ title: 'Minimal' })

    expect(result).toContain('title: Minimal')
    expect(result).not.toContain('cid')
    expect(result).not.toContain('description')
    expect(result).not.toContain('category')
    expect(result).not.toContain('tags')
    expect(result).not.toContain('created_at')
    expect(result).not.toContain('updated_at')
    expect(result).not.toContain('published')
  })

  test('serializes tags array correctly', () => {
    const result = serializeFrontmatter({
      title: 'Test',
      tags: ['alpha', 'beta'],
    })

    expect(result).toContain('tags:')
    expect(result).toContain('  - alpha')
    expect(result).toContain('  - beta')
  })

  test('omits empty tags array', () => {
    const result = serializeFrontmatter({ title: 'Test', tags: [] })

    expect(result).not.toContain('tags')
  })

  test('includes published: false when explicitly set', () => {
    const result = serializeFrontmatter({ title: 'Draft', published: false })

    expect(result).toContain('published: false')
  })

  test('wraps output in YAML delimiters', () => {
    const result = serializeFrontmatter({ title: 'Test' })

    expect(result).toMatch(/^---\n/)
    expect(result).toMatch(/\n---$/)
  })
})
