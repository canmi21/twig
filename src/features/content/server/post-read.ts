/* src/features/content/server/post-read.ts */

import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { notFound } from '@tanstack/react-router'
import { getDb, getPostHtml } from '~/features/platform/server'
import { ContentStatus, ContentType, contents, notes, posts } from '~/server/database'
import { renderMarkdown } from '~/server/markdown'

// ---------------------------------------------------------------------------
// GetPublishedPostBySlug
// ---------------------------------------------------------------------------

export const getPublishedPostBySlug = createServerFn({ method: 'GET' })
	.inputValidator((d: { slug: string }) => {
		if (!d.slug) {
			throw new Error('Slug is required')
		}
		return d
	})
	.handler(async ({ data }) => {
		const db = getDb()

		// Check D1 for meta and status
		const rows = await db
			.select({
				cid: contents.cid,
				cover: posts.cover,
				createdAt: contents.createdAt,
				slug: posts.slug,
				summary: posts.summary,
				tags: posts.tags,
				title: posts.title,
				updatedAt: contents.updatedAt,
				content: posts.content,
				status: contents.status,
			})
			.from(contents)
			.innerJoin(posts, eq(contents.cid, posts.cid))
			.where(and(eq(posts.slug, data.slug), eq(contents.status, ContentStatus.PUBLISHED)))
			.limit(1)

		if (rows.length === 0) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router control flow
			throw notFound()
		}
		const [row] = rows

		// Try KV cache first
		const cachedHtml = await getPostHtml(data.slug)
		if (cachedHtml) {
			return {
				html: cachedHtml,
				meta: {
					cid: row.cid,
					title: row.title,
					summary: row.summary,
					tags: row.tags,
					cover: row.cover,
					createdAt: row.createdAt,
					updatedAt: row.updatedAt,
				},
			}
		}

		// KV miss: render from D1 content, do not write back to KV
		const html = await renderMarkdown(row.content)
		return {
			html,
			meta: {
				cid: row.cid,
				title: row.title,
				summary: row.summary,
				tags: row.tags,
				cover: row.cover,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			},
		}
	})

// ---------------------------------------------------------------------------
// Timeline item types
// ---------------------------------------------------------------------------

interface TimelinePostItem {
	cid: string
	type: 'post'
	createdAt: string
	title: string
	slug: string
	summary: string | null
}

interface TimelineNoteItem {
	cid: string
	type: 'note'
	createdAt: string
	text: string
	images: string | null
}

export type TimelineItem = TimelinePostItem | TimelineNoteItem

// ---------------------------------------------------------------------------
// GetTimelineItems
// ---------------------------------------------------------------------------

export const getTimelineItems = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDb()

	// Fetch published posts
	const postRows = await db
		.select({
			cid: contents.cid,
			createdAt: contents.createdAt,
			title: posts.title,
			slug: posts.slug,
			summary: posts.summary,
		})
		.from(contents)
		.innerJoin(posts, eq(contents.cid, posts.cid))
		.where(and(eq(contents.type, ContentType.POST), eq(contents.status, ContentStatus.PUBLISHED)))
		.orderBy(desc(contents.createdAt))

	const postItems: TimelinePostItem[] = postRows.map((row) => ({
		cid: row.cid,
		type: 'post' as const,
		createdAt: row.createdAt,
		title: row.title,
		slug: row.slug,
		summary: row.summary,
	}))

	// Fetch published notes
	const noteRows = await db
		.select({
			cid: contents.cid,
			createdAt: contents.createdAt,
			text: notes.text,
			images: notes.images,
		})
		.from(contents)
		.innerJoin(notes, eq(contents.cid, notes.cid))
		.where(and(eq(contents.type, ContentType.NOTE), eq(contents.status, ContentStatus.PUBLISHED)))
		.orderBy(desc(contents.createdAt))

	const noteItems: TimelineNoteItem[] = noteRows.map((row) => ({
		cid: row.cid,
		type: 'note' as const,
		createdAt: row.createdAt,
		text: row.text,
		images: row.images,
	}))

	// Merge and sort by createdAt descending
	return [...postItems, ...noteItems].toSorted(
		(left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
	)
})
