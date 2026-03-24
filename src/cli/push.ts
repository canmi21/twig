/* src/cli/push.ts */

import { resolve, relative, extname } from 'node:path'
import { readdir, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createDb } from '../lib/database/index'
import type { Db } from '../lib/database/index'
import { getAllPosts, upsertPost, deletePost } from '../lib/database/posts'
import {
  getMediaByHash,
  insertMedia,
  upsertMediaRef,
  deleteMediaRefsForPost,
  getMediaRefCount,
  deleteMedia,
  getMediaForPost,
} from '../lib/database/media'
import { posts } from '../lib/database/schema'
import { storageKey } from '../lib/database/storage-key'
import { mimeFromExt } from '../lib/database/mime'
import { compile } from '../lib/compiler/index'
import type { Frontmatter } from '../lib/compiler/index'
import { parse as parseYaml } from 'yaml'
import { postSchema } from '../lib/content/post-schema'
import { writePostKv, writePostIndex, deletePostKv } from '../lib/content/kv'
import type { PostIndexEntry } from '../lib/content/kv'
import { createMiniflare, applyMigrations } from './local-env'

const ROOT = resolve(import.meta.dirname, '../..')
const POSTS_DIR = resolve(ROOT, 'contents/posts')

// --- Scanning ---

interface ScannedPost {
  slug: string
  frontmatter: Frontmatter
  content: string
  rawContentHash: string
  mediaFiles: Array<{ relativePath: string; absolutePath: string }>
}

function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
}

function extractFrontmatter(source: string): {
  frontmatter: Frontmatter
  content: string
} {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: { title: '' }, content: source }
  return {
    frontmatter: parseYaml(match[1]) as Frontmatter,
    content: match[2].trim(),
  }
}

async function collectFiles(
  dir: string,
  base: string,
): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  const results: Array<{ relativePath: string; absolutePath: string }> = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const abs = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(abs, base)))
    } else if (entry.name !== 'index.md') {
      results.push({
        relativePath: `./${relative(base, abs)}`,
        absolutePath: abs,
      })
    }
  }
  return results
}

async function scanPosts(): Promise<ScannedPost[]> {
  let entries: string[]
  try {
    entries = await readdir(POSTS_DIR)
  } catch {
    return []
  }
  const results: ScannedPost[] = []
  for (const slug of entries) {
    const slugDir = resolve(POSTS_DIR, slug)
    const slugStat = await stat(slugDir).catch(() => null)
    if (!slugStat?.isDirectory()) continue
    const indexPath = resolve(slugDir, 'index.md')
    try {
      const source = await readFile(indexPath, 'utf-8')
      const { frontmatter, content } = extractFrontmatter(source)
      const mediaFiles = await collectFiles(slugDir, slugDir)
      results.push({
        slug,
        frontmatter,
        content,
        rawContentHash: computeContentHash(content),
        mediaFiles,
      })
    } catch {
      // skip directories without index.md
    }
  }
  return results
}

// --- Phase 1: Validate ---

function validateAll(scanned: ScannedPost[]): boolean {
  let valid = true
  for (const post of scanned) {
    const result = postSchema.safeParse({
      slug: post.slug,
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      category: post.frontmatter.category,
      tags: post.frontmatter.tags,
      content: post.content,
      cid: post.frontmatter.cid,
      created_at: post.frontmatter.created_at,
      updated_at: post.frontmatter.updated_at,
      published: post.frontmatter.published,
    })
    if (!result.success) {
      valid = false
      console.log(`push aborted: validation failed for "${post.slug}"`)
      for (const issue of result.error.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message}`)
      }
    }
  }
  return valid
}

// --- Phase 2: Diff ---

interface DiffResult {
  added: ScannedPost[]
  updated: ScannedPost[]
  deleted: Array<{ slug: string; cid: string }>
  unchanged: string[]
}

async function diffPosts(db: Db, scanned: ScannedPost[]): Promise<DiffResult> {
  const dbPosts = await getAllPosts(db)
  const dbByCid = new Map(dbPosts.map((p) => [p.cid, p]))
  const dbBySlug = new Map(dbPosts.map((p) => [p.slug, p]))
  const matchedCids = new Set<string>()

  const added: ScannedPost[] = []
  const updated: ScannedPost[] = []
  const unchanged: string[] = []

  for (const post of scanned) {
    // Match by cid first, then by slug
    let existing = post.frontmatter.cid
      ? dbByCid.get(post.frontmatter.cid)
      : undefined
    if (!existing) existing = dbBySlug.get(post.slug)

    if (!existing) {
      added.push(post)
      continue
    }
    matchedCids.add(existing.cid)

    // Fast path: compare content hash
    const contentChanged =
      !existing.contentHash || existing.contentHash !== post.rawContentHash

    // Compare frontmatter fields
    const tagsJson = post.frontmatter.tags
      ? JSON.stringify(post.frontmatter.tags)
      : null
    const fieldsChanged =
      existing.title !== post.frontmatter.title ||
      (existing.description ?? undefined) !== post.frontmatter.description ||
      (existing.category ?? undefined) !== post.frontmatter.category ||
      existing.tags !== tagsJson ||
      existing.slug !== post.slug

    // Check published change
    const publishedChanged =
      post.frontmatter.published !== undefined &&
      existing.published !== (post.frontmatter.published ? 1 : 0)

    // Check manual updated_at override
    const updatedAtOverride =
      post.frontmatter.updated_at !== undefined &&
      post.frontmatter.updated_at !== existing.updatedAt

    if (
      contentChanged ||
      fieldsChanged ||
      publishedChanged ||
      updatedAtOverride
    ) {
      updated.push(post)
    } else {
      // Expensive path: check media files (only when everything else matches)
      const dbMedia = await getMediaForPost(db, existing.cid)
      const dbHashes = new Set(dbMedia.map((m) => m.hash))
      let mediaChanged = false
      for (const mf of post.mediaFiles) {
        const data = await readFile(mf.absolutePath)
        const hash = createHash('sha256').update(data).digest('hex')
        if (!dbHashes.has(hash)) {
          mediaChanged = true
          break
        }
      }
      if (mediaChanged || dbHashes.size !== post.mediaFiles.length) {
        updated.push(post)
      } else {
        unchanged.push(post.slug)
      }
    }
  }

  // Unmatched DB posts = deleted
  const deleted: Array<{ slug: string; cid: string }> = []
  for (const row of dbPosts) {
    if (!matchedCids.has(row.cid)) {
      deleted.push({ slug: row.slug, cid: row.cid })
    }
  }

  return { added, updated, deleted, unchanged }
}

// --- Phase 3: Execute ---

async function processMedia(
  db: Db,
  r2: R2Bucket,
  cid: string,
  mediaFiles: ScannedPost['mediaFiles'],
): Promise<Map<string, string>> {
  const replacements = new Map<string, string>()
  for (const { relativePath, absolutePath } of mediaFiles) {
    const data = await readFile(absolutePath)
    const hash = createHash('sha256').update(data).digest('hex')
    const ext = extname(absolutePath).slice(1).toLowerCase()
    replacements.set(relativePath, `${hash}.${ext}`)

    const existing = await getMediaByHash(db, hash)
    if (!existing) {
      const key = storageKey(hash, ext)
      await r2.put(key, new Uint8Array(data), {
        httpMetadata: { contentType: mimeFromExt(ext) },
      })
      await insertMedia(db, {
        hash,
        ext,
        mime: mimeFromExt(ext),
        size: data.length,
        createdAt: new Date().toISOString(),
      })
    }
    await upsertMediaRef(db, hash, cid)
  }
  return replacements
}

function replaceMediaRefs(
  content: string,
  replacements: Map<string, string>,
): string {
  let result = content
  for (const [original, hashed] of replacements) {
    result = result.replaceAll(original, hashed)
  }
  return result
}

async function executeAddOrUpdate(
  db: Db,
  r2: R2Bucket,
  kv: KVNamespace,
  post: ScannedPost,
): Promise<void> {
  const result = await upsertPost(db, {
    slug: post.slug,
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    category: post.frontmatter.category,
    tags: post.frontmatter.tags,
    content: post.content,
    contentHash: post.rawContentHash,
    cid: post.frontmatter.cid,
    createdAt: post.frontmatter.created_at,
    updatedAt: post.frontmatter.updated_at,
    published: post.frontmatter.published,
  })

  let finalContent = post.content
  if (post.mediaFiles.length > 0) {
    const replacements = await processMedia(db, r2, result.cid, post.mediaFiles)
    finalContent = replaceMediaRefs(post.content, replacements)
    if (finalContent !== post.content) {
      await db
        .update(posts)
        .set({ content: finalContent })
        .where(eq(posts.cid, result.cid))
    }
  }

  const compiled = await compile(finalContent)
  await writePostKv(kv, post.slug, {
    frontmatter: post.frontmatter,
    html: compiled.html,
    toc: compiled.toc,
    components: compiled.components,
  })
}

async function executeDelete(
  db: Db,
  r2: R2Bucket,
  kv: KVNamespace,
  slug: string,
  cid: string,
): Promise<void> {
  // Clean media refs and orphaned media
  const hashes = await deleteMediaRefsForPost(db, cid)
  for (const hash of hashes) {
    const refCount = await getMediaRefCount(db, hash)
    if (refCount === 0) {
      const row = await getMediaByHash(db, hash)
      if (row) {
        await r2.delete(storageKey(row.hash, row.ext))
        await deleteMedia(db, hash)
      }
    }
  }

  await deletePost(db, cid)
  await deletePostKv(kv, slug)
}

async function buildPostIndex(db: Db): Promise<PostIndexEntry[]> {
  const allPosts = await getAllPosts(db)
  return allPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description ?? undefined,
    category: p.category ?? undefined,
    tags: p.tags ? (JSON.parse(p.tags) as string[]) : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    published: p.published === 1,
  }))
}

// --- Main ---

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('taki_sql')
    const r2 = (await mf.getR2Bucket('taki_bucket')) as unknown as R2Bucket
    const kv = (await mf.getKVNamespace('taki_kv')) as unknown as KVNamespace

    await applyMigrations(d1)
    const db = createDb(d1)

    // Phase 1: Scan + Validate
    const scanned = await scanPosts()
    if (!validateAll(scanned)) {
      process.exit(1)
    }

    // Phase 2: Diff
    const diff = await diffPosts(db, scanned)

    if (
      diff.added.length === 0 &&
      diff.updated.length === 0 &&
      diff.deleted.length === 0
    ) {
      console.log('push complete: no changes')
      return
    }

    // Phase 3: Execute
    for (const post of diff.added) {
      await executeAddOrUpdate(db, r2, kv, post)
    }
    for (const post of diff.updated) {
      await executeAddOrUpdate(db, r2, kv, post)
    }
    for (const { slug, cid } of diff.deleted) {
      await executeDelete(db, r2, kv, slug, cid)
    }

    // Update post-index
    const index = await buildPostIndex(db)
    await writePostIndex(kv, index)

    console.log(
      `push complete: ${diff.added.length} added, ${diff.updated.length} updated, ${diff.deleted.length} deleted, ${diff.unchanged.length} unchanged`,
    )
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
