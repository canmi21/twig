/* src/features/content/server/post.ts */

import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import {
	deletePostHtml,
	generateCid,
	getDb,
	purgeUrls,
	setPostHtml,
} from '~/features/platform/server'
import { requireAuth } from '~/server/auth.server'
import { ContentStatus, ContentType, contents, posts } from '~/server/database'
import { renderMarkdown } from '~/server/markdown'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Derive site origin from the current request for CDN purge URLs. */
async function postPageUrl(slug: string): Promise<string> {
	const { getRequestHeader } = await import('@tanstack/react-start/server')
	const host = getRequestHeader('host') ?? 'localhost'
	const proto = import.meta.env.DEV ? 'http' : 'https'
	return `${proto}://${host}/post/${slug}`
}

// ---------------------------------------------------------------------------
// ListPosts
// ---------------------------------------------------------------------------

export const listPosts = createServerFn({ method: 'GET' })
	.inputValidator((d: { status?: ContentStatus }) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()
		const where = data.status
			? and(eq(contents.type, ContentType.POST), eq(contents.status, data.status))
			: eq(contents.type, ContentType.POST)

		return db
			.select({
				cid: contents.cid,
				createdAt: contents.createdAt,
				slug: posts.slug,
				status: contents.status,
				tags: posts.tags,
				title: posts.title,
				updatedAt: contents.updatedAt,
			})
			.from(contents)
			.innerJoin(posts, eq(contents.cid, posts.cid))
			.where(where)
			.orderBy(desc(contents.createdAt))
	})

// ---------------------------------------------------------------------------
// GetPost
// ---------------------------------------------------------------------------

export const getPost = createServerFn({ method: 'GET' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()
		const rows = await db
			.select({
				cid: contents.cid,
				content: posts.content,
				cover: posts.cover,
				createdAt: contents.createdAt,
				slug: posts.slug,
				status: contents.status,
				summary: posts.summary,
				tags: posts.tags,
				title: posts.title,
				type: contents.type,
				updatedAt: contents.updatedAt,
			})
			.from(contents)
			.innerJoin(posts, eq(contents.cid, posts.cid))
			.where(eq(contents.cid, data.cid))
			.limit(1)

		if (rows.length === 0) {
			throw new Error('Post not found')
		}
		const [row] = rows
		return row
	})

// ---------------------------------------------------------------------------
// CreatePost
// ---------------------------------------------------------------------------

export const createPost = createServerFn({ method: 'POST' })
	.inputValidator(
		(d: {
			title: string
			slug: string
			content: string
			summary?: string
			tags?: string[]
			cover?: string
		}) => {
			if (!d.title.trim()) {
				throw new Error('Title is required')
			}
			if (!d.slug.trim()) {
				throw new Error('Slug is required')
			}
			if (!SLUG_RE.test(d.slug.trim())) {
				throw new Error('Slug must be lowercase alphanumeric with hyphens')
			}
			if (!d.content.trim()) {
				throw new Error('Content is required')
			}
			return d
		},
	)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()
		const cid = generateCid()
		const now = new Date().toISOString()

		await db.insert(contents).values({
			cid,
			createdAt: now,
			status: ContentStatus.DRAFT,
			type: ContentType.POST,
			updatedAt: now,
		})

		await db.insert(posts).values({
			cid,
			content: data.content,
			cover: data.cover ?? null,
			slug: data.slug.trim(),
			summary: data.summary?.trim() ?? null,
			tags: data.tags ? JSON.stringify(data.tags) : '[]',
			title: data.title.trim(),
		})

		return { cid }
	})

// ---------------------------------------------------------------------------
// UpdatePost
// ---------------------------------------------------------------------------

export const updatePost = createServerFn({ method: 'POST' })
	.inputValidator(
		(d: {
			cid: string
			title?: string
			slug?: string
			content?: string
			summary?: string | null
			tags?: string[]
			cover?: string | null
		}) => {
			if (d.title !== undefined && !d.title.trim()) {
				throw new Error('Title cannot be empty')
			}
			if (d.slug !== undefined) {
				if (!d.slug.trim()) {
					throw new Error('Slug cannot be empty')
				}
				if (!SLUG_RE.test(d.slug.trim())) {
					throw new Error('Slug must be lowercase alphanumeric with hyphens')
				}
			}
			return d
		},
	)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()
		const now = new Date().toISOString()

		// Fetch current state
		const rows = await db
			.select({
				content: posts.content,
				slug: posts.slug,
				status: contents.status,
			})
			.from(contents)
			.innerJoin(posts, eq(contents.cid, posts.cid))
			.where(eq(contents.cid, data.cid))
			.limit(1)

		if (rows.length === 0) {
			throw new Error('Post not found')
		}
		const [existing] = rows

		// Update posts table
		const postFields: Record<string, string | null> = {}
		if (data.title !== undefined) {
			postFields.title = data.title.trim()
		}
		if (data.slug !== undefined) {
			postFields.slug = data.slug.trim()
		}
		if (data.content !== undefined) {
			postFields.content = data.content
		}
		if (data.summary !== undefined) {
			postFields.summary = data.summary?.trim() ?? null
		}
		if (data.tags !== undefined) {
			postFields.tags = JSON.stringify(data.tags)
		}
		if (data.cover !== undefined) {
			postFields.cover = data.cover ?? null
		}

		if (Object.keys(postFields).length > 0) {
			await db.update(posts).set(postFields).where(eq(posts.cid, data.cid))
		}

		// Update contents.updated_at
		await db.update(contents).set({ updatedAt: now }).where(eq(contents.cid, data.cid))

		// If published: re-render → update KV → handle slug change → purge CDN
		if (existing.status === ContentStatus.PUBLISHED) {
			const effectiveContent = data.content ?? existing.content
			const effectiveSlug = data.slug?.trim() ?? existing.slug

			const html = await renderMarkdown(effectiveContent)
			await setPostHtml(effectiveSlug, html)

			// Slug changed → remove old KV entry
			if (data.slug && data.slug.trim() !== existing.slug) {
				await deletePostHtml(existing.slug)
			}

			const urls = [await postPageUrl(effectiveSlug)]
			if (data.slug && data.slug.trim() !== existing.slug) {
				urls.push(await postPageUrl(existing.slug))
			}
			await purgeUrls(urls)
		}
	})

// ---------------------------------------------------------------------------
// PublishPost
// ---------------------------------------------------------------------------

export const publishPost = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()
		const now = new Date().toISOString()

		const rows = await db
			.select({ content: posts.content, slug: posts.slug })
			.from(posts)
			.where(eq(posts.cid, data.cid))
			.limit(1)

		if (rows.length === 0) {
			throw new Error('Post not found')
		}
		const [post] = rows

		await db
			.update(contents)
			.set({ status: ContentStatus.PUBLISHED, updatedAt: now })
			.where(eq(contents.cid, data.cid))

		const html = await renderMarkdown(post.content)
		await setPostHtml(post.slug, html)

		await purgeUrls([await postPageUrl(post.slug)])
	})

// ---------------------------------------------------------------------------
// UnpublishPost
// ---------------------------------------------------------------------------

export const unpublishPost = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()
		const now = new Date().toISOString()

		const rows = await db
			.select({ slug: posts.slug })
			.from(posts)
			.where(eq(posts.cid, data.cid))
			.limit(1)

		if (rows.length === 0) {
			throw new Error('Post not found')
		}
		const [{ slug }] = rows

		await db
			.update(contents)
			.set({ status: ContentStatus.DRAFT, updatedAt: now })
			.where(eq(contents.cid, data.cid))

		await deletePostHtml(slug)
		await purgeUrls([await postPageUrl(slug)])
	})

// ---------------------------------------------------------------------------
// DeletePost
// ---------------------------------------------------------------------------

export const deletePost = createServerFn({ method: 'POST' })
	.inputValidator((d: { cid: string }) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()

		const rows = await db
			.select({ slug: posts.slug, status: contents.status })
			.from(contents)
			.innerJoin(posts, eq(contents.cid, posts.cid))
			.where(eq(contents.cid, data.cid))
			.limit(1)

		if (rows.length === 0) {
			throw new Error('Post not found')
		}
		const [{ status, slug }] = rows

		// Clean up cache and CDN for published posts
		if (status === ContentStatus.PUBLISHED) {
			await deletePostHtml(slug)
			await purgeUrls([await postPageUrl(slug)])
		}

		// Delete in FK order: posts → contents
		await db.delete(posts).where(eq(posts.cid, data.cid))
		await db.delete(contents).where(eq(contents.cid, data.cid))
	})
