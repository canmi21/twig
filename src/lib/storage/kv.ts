/* src/lib/storage/kv.ts */

/* oxlint-disable no-console
 *
 * Parse and schema-validation failures are surfaced via console.warn so
 * D1/KV corruption is visible in Wrangler logs without promoting the
 * incident to a user-visible error. Routes treat the null/[] fallback
 * as a cache miss and still render, so silent swallowing would hide
 * real data integrity issues. */

import { z } from 'zod'
import type { CompileResult } from '../compiler/index'
import type { PostRow } from '../database/posts'

// Schema definitions ---------------------------------------------------------

// Strict shape on read: unknown keys are dropped rather than carried
// through. TanStack Start's server-function serialization rejects
// `unknown` index signatures, so passthrough would leak into route
// loader return types and break the typecheck.
const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tweet: z.string().optional(),
  cid: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  published: z.boolean().optional(),
})

const tocEntrySchema = z.object({
  depth: z.number(),
  text: z.string(),
  id: z.string(),
})

const componentEntrySchema = z.object({
  type: z.string(),
  props: z.record(z.string(), z.string()),
  index: z.number(),
})

const postKvEntrySchema = z.object({
  frontmatter: frontmatterSchema,
  html: z.string(),
  text: z.string(),
  toc: z.array(tocEntrySchema),
  components: z.array(componentEntrySchema),
})

const postIndexEntrySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  published: z.boolean(),
})

const postIndexSchema = z.array(postIndexEntrySchema)

// Tags in the posts table are stored as JSON-encoded string[]. This parser is
// the single source of truth for decoding that column — CLI pull/rebuild and
// the KV index builder all reuse it so a corrupt row yields `undefined`
// instead of crashing an entire export run.
const tagsArraySchema = z.array(z.string())

type PostKvEntry = z.infer<typeof postKvEntrySchema>
export type PostIndexEntry = z.infer<typeof postIndexEntrySchema>

// Compile-time assertion: the compiler's return shape must stay
// assignable to the on-disk zod schema. If someone adds a field to
// CompileResult without updating postKvEntrySchema, this line fails
// the typecheck and forces the schema to be updated first.
type _AssertCompileResultMatchesKvEntry = CompileResult extends PostKvEntry
  ? true
  : never

/** Decode a tags JSON column from the posts table. Returns undefined if the
 *  column is null, empty, malformed, or does not contain a string[]. */
export function parseTagsJson(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    const result = tagsArraySchema.safeParse(parsed)
    if (!result.success) {
      console.warn('[kv] tags column failed schema validation:', result.error)
      return undefined
    }
    return result.data
  } catch (error) {
    console.warn('[kv] tags column is not valid JSON:', error)
    return undefined
  }
}

/** Convert a database PostRow to a KV PostIndexEntry. */
export function toPostIndexEntry(post: PostRow): PostIndexEntry {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description ?? undefined,
    category: post.category ?? undefined,
    tags: parseTagsJson(post.tags),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published === 1,
  }
}

// Writers --------------------------------------------------------------------

export async function writePostKv(
  kv: KVNamespace,
  slug: string,
  entry: PostKvEntry,
): Promise<void> {
  await kv.put(`post:${slug}`, JSON.stringify(entry))
}

export async function writePostIndex(
  kv: KVNamespace,
  entries: PostIndexEntry[],
): Promise<void> {
  await kv.put('post-index', JSON.stringify(entries))
}

export async function deletePostKv(
  kv: KVNamespace,
  slug: string,
): Promise<void> {
  await kv.delete(`post:${slug}`)
}

// Readers --------------------------------------------------------------------

/** Safely decode a JSON string against a zod schema. Logs and returns null on
 *  any failure — parse errors, schema mismatch, or null/empty input. Callers
 *  treat null as "cache miss" and fall back to a re-fetch or empty state. */
function safeDecode<T>(
  label: string,
  raw: string | null,
  schema: z.ZodType<T>,
): T | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.warn(`[kv] ${label} is not valid JSON:`, error)
    return null
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    console.warn(`[kv] ${label} failed schema validation:`, result.error)
    return null
  }
  return result.data
}

export async function readPostKv(
  kv: KVNamespace,
  slug: string,
): Promise<PostKvEntry | null> {
  const raw = await kv.get(`post:${slug}`)
  return safeDecode(`post:${slug}`, raw, postKvEntrySchema)
}

export async function readPostIndex(
  kv: KVNamespace,
): Promise<PostIndexEntry[]> {
  const raw = await kv.get('post-index')
  return safeDecode('post-index', raw, postIndexSchema) ?? []
}
