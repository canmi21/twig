/* src/server/editor-api.ts */

/* src/server/editor-api.ts
 *
 * Server functions for the editor route: post CRUD and media upload.
 * Extracted from the route file to keep route components focused on UI.
 */

import { createServerFn } from '@tanstack/react-start'
import { getDb, getCache, getBucket } from '~/server/platform'
import {
  getPostByCid,
  upsertPostMetadata,
  finalizePostContent,
  getAllPosts,
} from '~/lib/database/posts'
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
import { requireAdmin } from '~/server/admin-guard'
import { extractFrontmatterSource } from '~/lib/compiler/frontmatter'

// Max decoded size for a single media upload. The pipeline only accepts
// image mimes (see extFromMime below), so 10 MiB is a generous cap that
// still protects the worker's memory budget from accidental or
// adversarial oversized base64 payloads.
const MAX_MEDIA_UPLOAD_BYTES = 10 * 1024 * 1024

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
    await requireAdmin()

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

    // Phase A: reserve the row and write metadata only.
    const result = await upsertPostMetadata(db, {
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tags,
      tweet: parsed.data.tweet,
      cid: parsed.data.cid,
      createdAt: parsed.data.created_at,
    })

    // Phase B: refresh KV. Slug rename deletes the old key first so the
    // post-index rebuild cannot briefly expose both entries.
    if (oldSlug && oldSlug !== result.slug) {
      await deletePostKv(kv, oldSlug)
    }

    if (parsed.data.published) {
      const { compile } = await import('~/lib/compiler/index')
      const compiled = await compile(extracted.content)

      await writePostKv(kv, result.slug, {
        frontmatter: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          tags: parsed.data.tags,
          tweet: parsed.data.tweet,
          cid: result.cid,
          created_at: parsed.data.created_at,
          updated_at: parsed.data.updated_at,
          published: parsed.data.published,
        },
        html: compiled.html,
        text: compiled.text,
        toc: compiled.toc,
        components: compiled.components,
      })
    } else {
      await deletePostKv(kv, result.slug)
    }

    // Phase C: commit marker. contentHash + content + updatedAt flip
    // together so a crash anywhere above leaves the row with a stale
    // hash, cueing the next save (or a CLI push) to retry.
    await finalizePostContent(db, {
      cid: result.cid,
      content: extracted.content,
      contentHash,
      updatedAt: parsed.data.updated_at,
      published: parsed.data.published,
    })

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
    await requireAdmin()

    const ext = extFromMime[data.mime]
    if (!ext)
      return { ok: false as const, error: `Unsupported type: ${data.mime}` }

    // Reject oversized payloads before allocating. base64 is ~4/3 the
    // size of its binary, so a string longer than MAX * 4/3 (plus a
    // little padding slack) is guaranteed to exceed the cap once
    // decoded. Checking the string length first means adversarial
    // callers cannot force the worker to allocate a huge Uint8Array.
    const maxBase64 = Math.ceil((MAX_MEDIA_UPLOAD_BYTES * 4) / 3) + 4
    if (data.base64.length > maxBase64) {
      return {
        ok: false as const,
        error: `Media exceeds ${MAX_MEDIA_UPLOAD_BYTES} bytes`,
      }
    }

    const raw = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
    if (raw.byteLength > MAX_MEDIA_UPLOAD_BYTES) {
      return {
        ok: false as const,
        error: `Media exceeds ${MAX_MEDIA_UPLOAD_BYTES} bytes`,
      }
    }
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
