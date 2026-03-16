import { count, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '~/server/database/client'
import { baseContent } from '~/server/database/schema'
import type { ContentType } from '~/server/database/constants'
import { parseJson, parseTags } from './shared'
import type { ContentForEdit, DashboardStats } from './types'

type DashboardDb = ReturnType<typeof getDb>

export async function fetchDashboardStats(db: DashboardDb): Promise<DashboardStats> {
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
		countByType: typeCountRows.map((row) => ({ type: row.type, count: row.cnt })),
		recentItems: recentRows.map((row) => ({
			id: row.id,
			title: row.title,
			type: row.type as ContentType,
			createdAt: row.createdAt,
			isDraft: row.isDraft,
		})),
	}
}

export async function fetchContentForEdit(
	db: DashboardDb,
	id: string,
): Promise<ContentForEdit | null> {
	const [row] = await db.select().from(baseContent).where(eq(baseContent.id, id)).limit(1)
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
}

export async function fetchPublishedAt(
	db: DashboardDb,
	id: string,
): Promise<string | null | undefined> {
	const [existing] = await db
		.select({ publishedAt: baseContent.publishedAt })
		.from(baseContent)
		.where(eq(baseContent.id, id))
		.limit(1)
	return existing?.publishedAt
}
