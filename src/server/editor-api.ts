/* src/server/editor-api.ts */

/* src/server/editor-api.ts
 *
 * Server functions for the editor route: post CRUD and media upload.
 * Extracted from the route file to keep route components focused on UI.
 */

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getDb, getCache, getBucket } from '~/server/platform'
import { getPostByCid, upsertPost, getAllPosts } from '~/lib/database/posts'
import {
  writePostKv,
  deletePostKv,
  writePostIndex,
  toPostIndexEntry,
} from '~/lib/storage/kv'
import { computeContentHash } from '~/lib/utils/hash'
import { storageKey } from '~/lib/storage/storage-key'
import {
  getMediaByHash,
  insertMedia,
  upsertMediaRef,
} from '~/lib/database/media'
import { postSchema } from '~/lib/content/post-schema'
import { verifyCfAccess } from '~/server/auth'
import { extractFrontmatterSource } from '~/lib/compiler/frontmatter'

// ---------------------------------------------------------------------------
// Get post by cid
// ---------------------------------------------------------------------------

export const getPost = createServerFn({ method: 'GET' })
  .inputValidator((input: { cid: string }) => input)
  .handler(async ({ data }) => {
    const db = getDb()
    const post = await getPostByCid(db, data.cid)
    if (!post) throw new Error('Post not found')
    return post
  })

// ---------------------------------------------------------------------------
// Save post (validate, upsert, update KV cache)
// ---------------------------------------------------------------------------

interface SavePostData {
  cid: string
  slug: string
  category: string
  source: string
}

export const savePost = createServerFn({ method: 'POST' })
  .inputValidator((input: SavePostData) => input)
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      const identity = await verifyCfAccess(getRequest())
      if (!identity) throw new Error('Unauthorized')
    }

    let extracted: ReturnType<typeof extractFrontmatterSource>
    try {
      extracted = extractFrontmatterSource(data.source)
    } catch (error) {
      return {
        ok: false as const,
        errors: [
          error instanceof Error ? error.message : 'Frontmatter parse failed',
        ],
      }
    }

    if (extracted.frontmatter.cid && extracted.frontmatter.cid !== data.cid) {
      return {
        ok: false as const,
        errors: ['cid in frontmatter does not match current post'],
      }
    }

    const parsed = postSchema.safeParse({
      slug: data.slug,
      title: extracted.frontmatter.title,
      description: extracted.frontmatter.description,
      category: data.category,
      tags: extracted.frontmatter.tags,
      tweet: extracted.frontmatter.tweet,
      content: extracted.content,
      cid: extracted.frontmatter.cid ?? data.cid,
      created_at: extracted.frontmatter.created_at,
      updated_at: extracted.frontmatter.updated_at,
      published: extracted.frontmatter.published,
    })

    if (!parsed.success) {
      return {
        ok: false as const,
        errors: parsed.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`,
        ),
      }
    }

    const db = getDb()
    const kv = getCache()

    const oldPost = await getPostByCid(db, data.cid)
    const oldSlug = oldPost?.slug

    const contentHash = computeContentHash(extracted.content)
    const result = await upsertPost(db, {
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tags,
      tweet: parsed.data.tweet,
      content: extracted.content,
      contentHash,
      cid: parsed.data.cid,
      createdAt: parsed.data.created_at,
      updatedAt: parsed.data.updated_at,
      published: parsed.data.published,
    })

    if (oldSlug && oldSlug !== result.slug) {
      await deletePostKv(kv, oldSlug)
    }

    if (parsed.data.published) {
      const { compile } = await import('~/lib/compiler/index')
      const compiled = await compile(extracted.content)
      const savedPost = await getPostByCid(db, result.cid)

      await writePostKv(kv, result.slug, {
        frontmatter: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          tags: parsed.data.tags,
          tweet: parsed.data.tweet,
          cid: result.cid,
          created_at: savedPost?.createdAt ?? parsed.data.created_at,
          updated_at: savedPost?.updatedAt ?? parsed.data.updated_at,
          published: parsed.data.published,
        },
        html: compiled.html,
        toc: compiled.toc,
        components: compiled.components,
      })
    } else {
      await deletePostKv(kv, result.slug)
    }

    const allPosts = await getAllPosts(db)
    await writePostIndex(kv, allPosts.map(toPostIndexEntry))

    return { ok: true as const }
  })

// ---------------------------------------------------------------------------
// Upload media (hash, deduplicate, store in R2)
// ---------------------------------------------------------------------------

interface UploadMediaData {
  cid: string
  base64: string
  mime: string
}

const extFromMime: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

export const uploadMedia = createServerFn({ method: 'POST' })
  .inputValidator((input: UploadMediaData) => input)
  .handler(async ({ data }) => {
    if (!import.meta.env.DEV) {
      const identity = await verifyCfAccess(getRequest())
      if (!identity) throw new Error('Unauthorized')
    }

    const ext = extFromMime[data.mime]
    if (!ext)
      return { ok: false as const, error: `Unsupported type: ${data.mime}` }

    const raw = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
    const hashBuf = await crypto.subtle.digest('SHA-256', raw)
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const db = getDb()
    const bucket = getBucket()
    const key = storageKey(hash, ext)

    const existing = await getMediaByHash(db, hash)
    if (!existing) {
      await bucket.put(key, raw, { httpMetadata: { contentType: data.mime } })
      await insertMedia(db, {
        hash,
        ext,
        mime: data.mime,
        size: raw.byteLength,
        createdAt: new Date().toISOString(),
      })
    }

    await upsertMediaRef(db, hash, data.cid)
    return { ok: true as const, src: `${hash}.${ext}` }
  })
