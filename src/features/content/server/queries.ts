import { and, count, desc, eq, like, sql } from 'drizzle-orm'
import { getDb } from '~/server/database/client'
import { baseContent, mediaExtension, projectExtension } from '~/server/database/schema'
import {
	effectiveContentDate,
	ITEMS_PER_PAGE,
	joinSqlValues,
	type BaseContentRow,
	type MediaExtensionRow,
	type ProjectExtensionRow,
} from './shared'

type ContentDb = ReturnType<typeof getDb>

export async function fetchTimelinePageRows(
	db: ContentDb,
	input: { page: number; type?: string; tag?: string },
): Promise<{ rows: BaseContentRow[]; total: number }> {
	const conditions = [eq(baseContent.isDraft, 0)]
	if (input.type) conditions.push(eq(baseContent.type, input.type))
	if (input.tag) conditions.push(like(baseContent.tags, `%"${input.tag}"%`))

	const whereClause = and(...conditions)
	const [{ total }] = await db.select({ total: count() }).from(baseContent).where(whereClause)
	const offset = (input.page - 1) * ITEMS_PER_PAGE

	const rows = await db
		.select()
		.from(baseContent)
		.where(whereClause)
		.orderBy(desc(effectiveContentDate))
		.limit(ITEMS_PER_PAGE)
		.offset(offset)

	return { rows, total }
}

export async function fetchTimelineCursorRows(
	db: ContentDb,
	input: { cursor?: string; limit: number; until?: string },
): Promise<BaseContentRow[]> {
	const conditions = [eq(baseContent.isDraft, 0)]

	if (input.cursor) {
		const [cursorDate, cursorId] = input.cursor.split('__')
		conditions.push(
			sql`(${effectiveContentDate} < ${cursorDate} OR (${effectiveContentDate} = ${cursorDate} AND ${baseContent.id} < ${cursorId}))`,
		)
	}

	if (input.until && !input.cursor) {
		const dayEnd = `${input.until}T23:59:59.999Z`
		conditions.push(sql`${effectiveContentDate} <= ${dayEnd}`)
	}

	return db
		.select()
		.from(baseContent)
		.where(and(...conditions))
		.orderBy(desc(effectiveContentDate), desc(baseContent.id))
		.limit(input.limit + 1)
}

export async function fetchContentExtensions(
	db: ContentDb,
	contentIds: string[],
): Promise<{ projectRows: ProjectExtensionRow[]; mediaRows: MediaExtensionRow[] }> {
	if (contentIds.length === 0) {
		return { projectRows: [], mediaRows: [] }
	}

	const inClause = joinSqlValues(contentIds)
	const projectRows = await db
		.select()
		.from(projectExtension)
		.where(sql`${projectExtension.contentId} IN (${inClause})`)
	const mediaRows = await db
		.select()
		.from(mediaExtension)
		.where(sql`${mediaExtension.contentId} IN (${inClause})`)

	return { projectRows, mediaRows }
}

export async function fetchContentBySlug(
	db: ContentDb,
	slug: string,
): Promise<BaseContentRow | null> {
	const [row] = await db.select().from(baseContent).where(eq(baseContent.slug, slug)).limit(1)
	return row ?? null
}

export async function fetchContentById(db: ContentDb, id: string): Promise<BaseContentRow | null> {
	const [row] = await db.select().from(baseContent).where(eq(baseContent.id, id)).limit(1)
	return row ?? null
}

export async function fetchContentDetailExtensions(
	db: ContentDb,
	contentId: string,
): Promise<{ projectRow?: ProjectExtensionRow; mediaRow?: MediaExtensionRow }> {
	const [projectRow] = await db
		.select()
		.from(projectExtension)
		.where(eq(projectExtension.contentId, contentId))
		.limit(1)
	const [mediaRow] = await db
		.select()
		.from(mediaExtension)
		.where(eq(mediaExtension.contentId, contentId))
		.limit(1)

	return { projectRow, mediaRow }
}

export async function fetchPublishedProjects(db: ContentDb): Promise<BaseContentRow[]> {
	return db
		.select()
		.from(baseContent)
		.where(and(eq(baseContent.type, 'project'), eq(baseContent.isDraft, 0)))
		.orderBy(desc(effectiveContentDate))
}

export async function fetchPublishedMedia(db: ContentDb): Promise<BaseContentRow[]> {
	return db
		.select()
		.from(baseContent)
		.where(and(eq(baseContent.type, 'media'), eq(baseContent.isDraft, 0)))
		.orderBy(desc(effectiveContentDate))
}
