import { desc, count, eq, sql } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import { baseContent, projectExtension, mediaExtension } from '~/server/database/schema'
import type { ContentType } from '~/server/database/constants'

// -- Types --

export interface DashboardStats {
	totalCount: number
	draftCount: number
	countByType: { type: string; count: number }[]
	recentItems: {
		id: string
		title: string | null
		type: ContentType
		createdAt: string
		isDraft: number
	}[]
}

export interface ContentForEdit {
	id: string
	type: ContentType
	title: string | null
	slug: string | null
	content: string
	summary: string | null
	tags: string[]
	coverImage: string | null
	isDraft: number
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
	publishedAt: string | null
}

export interface SaveContentInput {
	id?: string
	type: ContentType
	title: string
	slug: string
	content: string
	summary?: string
	tags?: string[]
	coverImage?: string
	isDraft: number
	metadata?: Record<string, unknown>
}

// -- Helpers --

function parseTags(raw: string): string[] {
	try {
		return JSON.parse(raw) as string[]
	} catch {
		return []
	}
}

function parseJson(raw: string): Record<string, unknown> {
	try {
		return JSON.parse(raw) as Record<string, unknown>
	} catch {
		return {}
	}
}

function generateId(): string {
	return crypto.randomUUID()
}

function nowISO(): string {
	return new Date().toISOString()
}

// -- Server Functions --

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
	async (): Promise<DashboardStats> => {
		const db = getDb()

		const [{ total }] = await db.select({ total: count() }).from(baseContent)

		const [{ drafts }] = await db
			.select({ drafts: count() })
			.from(baseContent)
			.where(eq(baseContent.isDraft, 1))

		const typeCountRows = await db
			.select({ type: baseContent.type, cnt: count() })
			.from(baseContent)
			.groupBy(baseContent.type)
			.orderBy(desc(count()))

		const recentRows = await db
			.select({
				id: baseContent.id,
				title: baseContent.title,
				type: baseContent.type,
				createdAt: baseContent.createdAt,
				isDraft: baseContent.isDraft,
			})
			.from(baseContent)
			.orderBy(desc(sql`coalesce(${baseContent.publishedAt}, ${baseContent.createdAt})`))
			.limit(5)

		return {
			totalCount: total,
			draftCount: drafts,
			countByType: typeCountRows.map((r) => ({ type: r.type, count: r.cnt })),
			recentItems: recentRows.map((r) => ({
				id: r.id,
				title: r.title,
				type: r.type as ContentType,
				createdAt: r.createdAt,
				isDraft: r.isDraft,
			})),
		}
	},
)

export const getContentForEdit = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<ContentForEdit | null> => {
		const input = data as { id: string }
		const db = getDb()

		const [row] = await db.select().from(baseContent).where(eq(baseContent.id, input.id)).limit(1)
		if (!row) return null

		return {
			id: row.id,
			type: row.type as ContentType,
			title: row.title,
			slug: row.slug,
			content: row.content,
			summary: row.summary,
			tags: parseTags(row.tags),
			coverImage: row.coverImage,
			isDraft: row.isDraft,
			metadata: parseJson(row.metadata),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			publishedAt: row.publishedAt,
		}
	},
)

export const saveContent = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ id: string }> => {
		const input = data as SaveContentInput
		const db = getDb()
		const now = nowISO()

		if (input.id) {
			// Update existing
			const [existing] = await db
				.select({ publishedAt: baseContent.publishedAt })
				.from(baseContent)
				.where(eq(baseContent.id, input.id))
				.limit(1)

			// Set publishedAt on first publish
			const publishedAt =
				input.isDraft === 0 && !existing?.publishedAt ? now : (existing?.publishedAt ?? null)

			await db
				.update(baseContent)
				.set({
					type: input.type,
					title: input.title,
					slug: input.slug,
					content: input.content,
					summary: input.summary ?? null,
					tags: JSON.stringify(input.tags ?? []),
					coverImage: input.coverImage ?? null,
					isDraft: input.isDraft,
					metadata: JSON.stringify(input.metadata ?? {}),
					updatedAt: now,
					publishedAt,
				})
				.where(eq(baseContent.id, input.id))

			return { id: input.id }
		}

		// Insert new
		const id = generateId()
		const publishedAt = input.isDraft === 0 ? now : null

		await db.insert(baseContent).values({
			id,
			type: input.type,
			title: input.title,
			slug: input.slug,
			content: input.content,
			summary: input.summary ?? null,
			tags: JSON.stringify(input.tags ?? []),
			coverImage: input.coverImage ?? null,
			isDraft: input.isDraft,
			metadata: JSON.stringify(input.metadata ?? {}),
			createdAt: now,
			updatedAt: now,
			publishedAt,
		})

		return { id }
	},
)

export const deleteContent = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ success: boolean }> => {
		const input = data as { id: string }
		const db = getDb()

		// Delete extensions first (FK constraints)
		await db.delete(projectExtension).where(eq(projectExtension.contentId, input.id))
		await db.delete(mediaExtension).where(eq(mediaExtension.contentId, input.id))
		await db.delete(baseContent).where(eq(baseContent.id, input.id))

		return { success: true }
	},
)

export const renderPreview = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ html: string }> => {
		const input = data as { markdown: string }
		const { renderMarkdown } = await import('~/server/markdown')
		const html = await renderMarkdown(input.markdown)
		return { html }
	},
)

export const uploadImage = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ url: string }> => {
		const input = data as { base64: string; filename: string; contentType: string }
		const { env } = await import('cloudflare:workers')

		const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0))
		const key = `uploads/${Date.now()}-${input.filename}`

		await env.ASSETS.put(key, bytes, {
			httpMetadata: { contentType: input.contentType },
		})

		return { url: `/${key}` }
	},
)
