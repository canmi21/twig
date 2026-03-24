/* src/lib/content/post-schema.test.ts */

import { describe, expect, test } from 'vitest'
import { postSchema } from './post-schema'

const validInput = {
  slug: 'hello-world',
  category: 'dev',
  title: 'Hello World',
  description: 'A test post',
  tags: ['test', 'demo'],
  content: 'Some markdown content.',
}

describe('postSchema', () => {
  test('accepts fully valid input', () => {
    const result = postSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  test('accepts input without optional fields', () => {
    const result = postSchema.safeParse({
      slug: 'minimal',
      category: 'dev',
      title: 'Minimal',
      content: 'Body text.',
    })
    expect(result.success).toBe(true)
  })

  // --- slug ---

  test('rejects slug with uppercase', () => {
    const result = postSchema.safeParse({ ...validInput, slug: 'Hello-World' })
    expect(result.success).toBe(false)
  })

  test('rejects slug starting with hyphen', () => {
    const result = postSchema.safeParse({ ...validInput, slug: '-hello' })
    expect(result.success).toBe(false)
  })

  test('rejects empty slug', () => {
    const result = postSchema.safeParse({ ...validInput, slug: '' })
    expect(result.success).toBe(false)
  })

  // --- category ---

  test('rejects category with special characters', () => {
    const result = postSchema.safeParse({
      ...validInput,
      category: 'dev-ops',
    })
    expect(result.success).toBe(false)
  })

  test('rejects category with uppercase', () => {
    const result = postSchema.safeParse({ ...validInput, category: 'Dev' })
    expect(result.success).toBe(false)
  })

  // --- title ---

  test('rejects empty title', () => {
    const result = postSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
  })

  test('rejects title over 200 characters', () => {
    const result = postSchema.safeParse({
      ...validInput,
      title: 'x'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  // --- tags ---

  test('rejects more than 5 tags', () => {
    const result = postSchema.safeParse({
      ...validInput,
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(result.success).toBe(false)
  })

  test('rejects tag with uppercase', () => {
    const result = postSchema.safeParse({
      ...validInput,
      tags: ['Valid', 'test'],
    })
    expect(result.success).toBe(false)
  })

  // --- content ---

  test('rejects empty content', () => {
    const result = postSchema.safeParse({ ...validInput, content: '' })
    expect(result.success).toBe(false)
  })

  // --- required fields ---

  test('rejects missing slug', () => {
    const { slug: _, ...rest } = validInput
    const result = postSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  test('rejects missing category', () => {
    const { category: _, ...rest } = validInput
    const result = postSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  test('rejects missing title', () => {
    const { title: _, ...rest } = validInput
    const result = postSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  // --- optional metadata fields ---

  test('accepts valid cid', () => {
    const result = postSchema.safeParse({
      ...validInput,
      cid: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    })
    expect(result.success).toBe(true)
  })

  test('rejects cid with wrong length', () => {
    const result = postSchema.safeParse({ ...validInput, cid: 'abc123' })
    expect(result.success).toBe(false)
  })

  test('rejects cid with uppercase hex', () => {
    const result = postSchema.safeParse({
      ...validInput,
      cid: 'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6',
    })
    expect(result.success).toBe(false)
  })

  test('accepts valid ISO datetime for created_at', () => {
    const result = postSchema.safeParse({
      ...validInput,
      created_at: '2026-03-24T10:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  test('rejects non-ISO string for created_at', () => {
    const result = postSchema.safeParse({
      ...validInput,
      created_at: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  test('accepts valid ISO datetime for updated_at', () => {
    const result = postSchema.safeParse({
      ...validInput,
      updated_at: '2026-01-01T00:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  test('rejects non-ISO string for updated_at', () => {
    const result = postSchema.safeParse({
      ...validInput,
      updated_at: '2026/01/01',
    })
    expect(result.success).toBe(false)
  })

  test('accepts published boolean', () => {
    expect(
      postSchema.safeParse({ ...validInput, published: true }).success,
    ).toBe(true)
    expect(
      postSchema.safeParse({ ...validInput, published: false }).success,
    ).toBe(true)
  })

  test('rejects non-boolean published', () => {
    const result = postSchema.safeParse({ ...validInput, published: 'yes' })
    expect(result.success).toBe(false)
  })
})
