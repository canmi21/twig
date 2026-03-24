/* src/cli/push.ts */

import { resolve, relative, extname } from 'node:path'
import { readdir, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createDb } from '../lib/database/index'
import { upsertPost } from '../lib/database/posts'
import {
  getMediaByHash,
  insertMedia,
  upsertMediaRef,
} from '../lib/database/media'
import { contents, posts } from '../lib/database/schema'
import { storageKey } from '../lib/database/storage-key'
import { mimeFromExt } from '../lib/database/mime'
import { compile } from '../lib/compiler/index'
import type { Frontmatter } from '../lib/compiler/index'
import { parse as parseYaml } from 'yaml'
import { postSchema } from '../lib/content/post-schema'
import { writePostKv, writePostIndex } from '../lib/content/kv'
import { createMiniflare, applyMigrations } from './local-env'

const ROOT = resolve(import.meta.dirname, '../..')
const POSTS_DIR = resolve(ROOT, 'contents/posts')

function extractFrontmatter(source: string): {
  frontmatter: Frontmatter
  content: string
} {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: { title: '' }, content: source }

  return {
    frontmatter: parseYaml(match[1]) as Frontmatter,
    content: match[2].trimStart(),
  }
}

interface ScannedPost {
  slug: string
  source: string
  mediaFiles: Array<{ relativePath: string; absolutePath: string }>
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
    console.log('No posts directory found at', POSTS_DIR)
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
      const mediaFiles = await collectFiles(slugDir, slugDir)
      results.push({ slug, source, mediaFiles })
    } catch {
      // skip directories without index.md
    }
  }

  return results
}

async function processMedia(
  db: ReturnType<typeof createDb>,
  r2: R2Bucket,
  cid: string,
  mediaFiles: ScannedPost['mediaFiles'],
): Promise<Map<string, string>> {
  // Map: original relative path -> "{hash}.{ext}"
  const replacements = new Map<string, string>()

  for (const { relativePath, absolutePath } of mediaFiles) {
    const data = await readFile(absolutePath)
    const hash = createHash('sha256').update(data).digest('hex')
    const ext = extname(absolutePath).slice(1).toLowerCase()
    const hashName = `${hash}.${ext}`

    replacements.set(relativePath, hashName)

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
      console.log(`    media new: ${relativePath} -> ${key}`)
    } else {
      console.log(`    media exists: ${relativePath} (${hash.slice(0, 8)}...)`)
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

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('taki_sql')
    const r2 = (await mf.getR2Bucket('taki_bucket')) as unknown as R2Bucket
    const kv = (await mf.getKVNamespace('taki_kv')) as unknown as KVNamespace

    console.log('Applying migrations...')
    await applyMigrations(d1)

    const postFiles = await scanPosts()
    if (postFiles.length === 0) {
      console.log('No posts found.')
      return
    }

    console.log(`Found ${postFiles.length} post(s)\n`)

    const db = createDb(d1)

    let skipped = 0

    for (const { slug, source, mediaFiles } of postFiles) {
      const { frontmatter, content } = extractFrontmatter(source)

      const validation = postSchema.safeParse({
        slug,
        title: frontmatter.title,
        description: frontmatter.description,
        category: frontmatter.category,
        tags: frontmatter.tags,
        content,
      })

      if (!validation.success) {
        console.log(`  skipped: ${slug} (validation failed)`)
        for (const issue of validation.error.issues) {
          console.log(`    - ${issue.path.join('.')}: ${issue.message}`)
        }
        skipped++
        continue
      }

      // Upsert post first to get cid
      const result = await upsertPost(db, {
        slug,
        title: frontmatter.title,
        description: frontmatter.description,
        category: frontmatter.category,
        tags: frontmatter.tags,
        content,
      })

      console.log(`  ${result.action}: ${slug} (${result.cid})`)

      // Process media and replace references in content
      let finalContent = content
      if (mediaFiles.length > 0) {
        const replacements = await processMedia(db, r2, result.cid, mediaFiles)
        finalContent = replaceMediaRefs(content, replacements)

        if (finalContent !== content) {
          await db
            .update(posts)
            .set({ content: finalContent })
            .where(eq(posts.cid, result.cid))
          console.log(`    content refs updated`)
        }
      }

      // Compile and write to KV
      const compiled = await compile(finalContent)
      await writePostKv(kv, slug, {
        frontmatter,
        html: compiled.html,
        toc: compiled.toc,
        components: compiled.components,
      })
      console.log(`    kv written: post:${slug}`)
    }

    if (skipped > 0) {
      console.log(`\n${skipped} post(s) skipped due to validation errors.`)
    }

    // Build and write post-index to KV
    const allPosts = await db
      .select({
        slug: posts.slug,
        title: posts.title,
        description: posts.description,
        category: posts.category,
        tags: posts.tags,
        createdAt: contents.createdAt,
        updatedAt: contents.updatedAt,
      })
      .from(posts)
      .innerJoin(contents, eq(posts.cid, contents.cid))

    await writePostIndex(
      kv,
      allPosts.map((p) => ({
        slug: p.slug,
        title: p.title,
        description: p.description ?? undefined,
        category: p.category ?? undefined,
        tags: p.tags ? (JSON.parse(p.tags) as string[]) : undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    )
    console.log(`\npost-index written (${allPosts.length} entries)`)

    for (const p of allPosts) {
      console.log(`  - ${p.slug}: "${p.title}"`)
    }
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
