import { eq } from 'drizzle-orm'
import { env } from 'cloudflare:workers'
import { getDb } from '~/server/database/client'
import { baseContent, mediaExtension, projectExtension } from '~/server/database/schema'
import { generateId, nowIso } from './shared'
import type { SaveContentInput } from './types'

type DashboardDb = ReturnType<typeof getDb>

export async function upsertContent(
	db: DashboardDb,
	input: SaveContentInput,
	publishedAt: string | null,
) {
	const values = {
		type: input.type,
		title: input.title,
		slug: input.slug,
		content: input.content,
		summary: input.summary ?? null,
		tags: JSON.stringify(input.tags ?? []),
		coverImage: input.coverImage ?? null,
		isDraft: input.isDraft,
		metadata: JSON.stringify(input.metadata ?? {}),
		publishedAt,
	}

	if (input.id) {
		await db
			.update(baseContent)
			.set({
				...values,
				updatedAt: nowIso(),
			})
			.where(eq(baseContent.id, input.id))
		return input.id
	}

	const id = generateId()
	const now = nowIso()
	await db.insert(baseContent).values({
		id,
		...values,
		createdAt: now,
		updatedAt: now,
	})
	return id
}

export async function deleteContentRecord(db: DashboardDb, id: string) {
	await db.delete(projectExtension).where(eq(projectExtension.contentId, id))
	await db.delete(mediaExtension).where(eq(mediaExtension.contentId, id))
	await db.delete(baseContent).where(eq(baseContent.id, id))
}

export async function renderMarkdownPreview(markdown: string): Promise<string> {
	const { renderMarkdown } = await import('~/server/markdown')
	return renderMarkdown(markdown)
}

export async function uploadDashboardImage(input: {
	base64: string
	filename: string
	contentType: string
}): Promise<string> {
	const bytes = Uint8Array.from(atob(input.base64), (char) => char.charCodeAt(0))
	const key = `uploads/${Date.now()}-${input.filename}`

	await env.taki_bucket.put(key, bytes, {
		httpMetadata: { contentType: input.contentType },
	})

	return `/${key}`
}
