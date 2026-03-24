/* src/lib/storage/kv.ts */

import type { CompileResult } from '../compiler/index'

export interface PostKvEntry {
  frontmatter: CompileResult['frontmatter']
  html: string
  toc: CompileResult['toc']
  components: CompileResult['components']
}

export interface PostIndexEntry {
  slug: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  published: boolean
}

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

export async function readPostKv(
  kv: KVNamespace,
  slug: string,
): Promise<PostKvEntry | null> {
  const raw = await kv.get(`post:${slug}`)
  if (!raw) return null
  return JSON.parse(raw) as PostKvEntry
}

export async function readPostIndex(
  kv: KVNamespace,
): Promise<PostIndexEntry[]> {
  const raw = await kv.get('post-index')
  if (!raw) return []
  return JSON.parse(raw) as PostIndexEntry[]
}
