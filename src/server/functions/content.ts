import { desc, count, eq, sql, and, like } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import { baseContent, projectExtension, mediaExtension } from '~/server/database/schema'
import type { ContentType } from '~/server/database/constants'

const ITEMS_PER_PAGE = 12
const CURSOR_LIMIT = 10
const PREVIEW_LENGTH = 300

export interface TimelineItem {
	id: string
	type: ContentType
	title: string | null
	contentHtml: string
	summary: string | null
	tags: string[]
	coverImage: string | null
	slug: string | null
	isPinned: number
	metadata: Record<string, unknown>
	createdAt: string
	publishedAt: string | null
	// joined extension data
	project?: {
		status: string
		demoUrl: string | null
		repoUrl: string | null
		techStack: string[]
		role: string | null
	}
	media?: {
		mediaType: string
		rating: number | null
		creator: string | null
		cover: string | null
		year: number | null
		comment: string | null
	}
}

export interface CursorTimeline {
	items: TimelineItem[]
	nextCursor: string | null
}

export interface PaginatedTimeline {
	items: TimelineItem[]
	totalPages: number
	currentPage: number
}

export interface ContentDetail {
	id: string
	type: ContentType
	title: string | null
	contentHtml: string
	summary: string | null
	tags: string[]
	coverImage: string | null
	slug: string | null
	isPinned: number
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
	publishedAt: string | null
	project?: {
		status: string
		demoUrl: string | null
		repoUrl: string | null
		techStack: string[]
		screenshots: string[]
		role: string | null
	}
	media?: {
		mediaType: string
		rating: number | null
		creator: string | null
		cover: string | null
		year: number | null
		comment: string | null
		finishedAt: string | null
	}
}

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

function truncateContent(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text
	const truncated = text.slice(0, maxLen)
	const boundary = Math.max(truncated.lastIndexOf('\n'), truncated.lastIndexOf(' '))
	return (boundary > maxLen * 0.5 ? truncated.slice(0, boundary) : truncated) + '...'
}

export const getTimelineItems = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<PaginatedTimeline> => {
		const input = data as { page?: number; type?: string; tag?: string } | undefined
		const page = Math.max(1, input?.page ?? 1)
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')

		const conditions = [eq(baseContent.isDraft, 0)]
		if (input?.type) {
			conditions.push(eq(baseContent.type, input.type))
		}
		if (input?.tag) {
			conditions.push(like(baseContent.tags, `%"${input.tag}"%`))
		}

		const whereClause = and(...conditions)

		const [{ total }] = await db.select({ total: count() }).from(baseContent).where(whereClause)

		const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
		const offset = (page - 1) * ITEMS_PER_PAGE

		const rows = await db
			.select()
			.from(baseContent)
			.where(whereClause)
			.orderBy(
				desc(baseContent.isPinned),
				desc(sql`coalesce(${baseContent.publishedAt}, ${baseContent.createdAt})`),
			)
			.limit(ITEMS_PER_PAGE)
			.offset(offset)

		const contentIds = rows.map((r) => r.id)

		const projectRows =
			contentIds.length > 0
				? await db
						.select()
						.from(projectExtension)
						.where(
							sql`${projectExtension.contentId} IN (${sql.join(
								contentIds.map((id) => sql`${id}`),
								sql`, `,
							)})`,
						)
				: []

		const mediaRows =
			contentIds.length > 0
				? await db
						.select()
						.from(mediaExtension)
						.where(
							sql`${mediaExtension.contentId} IN (${sql.join(
								contentIds.map((id) => sql`${id}`),
								sql`, `,
							)})`,
						)
				: []

		const projectMap = new Map(projectRows.map((p) => [p.contentId, p]))
		const mediaMap = new Map(mediaRows.map((m) => [m.contentId, m]))

		const items = await Promise.all(
			rows.map(async (row): Promise<TimelineItem> => {
				const preview = truncateContent(row.content, PREVIEW_LENGTH)
				const contentHtml = await renderMarkdown(preview)

				const item: TimelineItem = {
					id: row.id,
					type: row.type as ContentType,
					title: row.title,
					contentHtml,
					summary: row.summary,
					tags: parseTags(row.tags),
					coverImage: row.coverImage,
					slug: row.slug,
					isPinned: row.isPinned,
					metadata: parseJson(row.metadata),
					createdAt: row.createdAt,
					publishedAt: row.publishedAt,
				}

				const proj = projectMap.get(row.id)
				if (proj) {
					item.project = {
						status: proj.status,
						demoUrl: proj.demoUrl,
						repoUrl: proj.repoUrl,
						techStack: parseTags(proj.techStack),
						role: proj.role,
					}
				}

				const med = mediaMap.get(row.id)
				if (med) {
					item.media = {
						mediaType: med.mediaType,
						rating: med.rating,
						creator: med.creator,
						cover: med.cover,
						year: med.year,
						comment: med.comment,
					}
				}

				return item
			}),
		)

		return { items, totalPages, currentPage: page }
	},
)

export const getTimelineCursor = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<CursorTimeline> => {
		const input = data as { cursor?: string; limit?: number; until?: string } | undefined
		const limit = input?.limit ?? CURSOR_LIMIT
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')

		const effectiveDate = sql`coalesce(${baseContent.publishedAt}, ${baseContent.createdAt})`
		const baseConditions = [eq(baseContent.isDraft, 0)]

		let pinnedItems: TimelineItem[] = []

		if (!input?.cursor) {
			// first load: fetch pinned items separately
			const pinnedRows = await db
				.select()
				.from(baseContent)
				.where(and(...baseConditions, eq(baseContent.isPinned, 1)))
				.orderBy(desc(effectiveDate))

			pinnedItems = await buildTimelineItems(pinnedRows, db, renderMarkdown)
		}

		// unpinned items with cursor condition
		const unpinnedConditions = [...baseConditions, eq(baseContent.isPinned, 0)]

		if (input?.cursor) {
			const [cursorDate, cursorId] = input.cursor.split('__')
			unpinnedConditions.push(
				sql`(${effectiveDate} < ${cursorDate} OR (${effectiveDate} = ${cursorDate} AND ${baseContent.id} < ${cursorId}))`,
			)
		}

		// "until" mode: load CURSOR_LIMIT items starting from the target date going older
		if (input?.until && !input.cursor) {
			const dayEnd = `${input.until}T23:59:59.999Z`

			const rows = await db
				.select()
				.from(baseContent)
				.where(and(...unpinnedConditions, sql`${effectiveDate} <= ${dayEnd}`))
				.orderBy(desc(effectiveDate), desc(baseContent.id))
				.limit(limit + 1)

			const hasMore = rows.length > limit
			const slicedRows = rows.slice(0, limit)
			const unpinnedItems = await buildTimelineItems(slicedRows, db, renderMarkdown)

			let nextCursor: string | null = null
			if (hasMore && slicedRows.length > 0) {
				const last = slicedRows[slicedRows.length - 1]
				nextCursor = `${last.publishedAt ?? last.createdAt}__${last.id}`
			}

			return {
				items: [...pinnedItems, ...unpinnedItems],
				nextCursor,
			}
		}

		const unpinnedRows = await db
			.select()
			.from(baseContent)
			.where(and(...unpinnedConditions))
			.orderBy(desc(effectiveDate), desc(baseContent.id))
			.limit(limit + 1)

		const hasMore = unpinnedRows.length > limit
		const slicedRows = unpinnedRows.slice(0, limit)
		const unpinnedItems = await buildTimelineItems(slicedRows, db, renderMarkdown)

		let nextCursor: string | null = null
		if (hasMore && slicedRows.length > 0) {
			const last = slicedRows[slicedRows.length - 1]
			const lastDate = last.publishedAt ?? last.createdAt
			nextCursor = `${lastDate}__${last.id}`
		}

		return {
			items: [...pinnedItems, ...unpinnedItems],
			nextCursor,
		}
	},
)

async function buildTimelineItems(
	rows: Array<{
		id: string
		type: string
		title: string | null
		content: string
		summary: string | null
		tags: string
		coverImage: string | null
		slug: string | null
		isPinned: number
		metadata: string
		createdAt: string
		updatedAt: string
		publishedAt: string | null
		isDraft: number
	}>,
	db: ReturnType<typeof getDb>,
	renderMarkdown: (s: string) => Promise<string>,
): Promise<TimelineItem[]> {
	if (rows.length === 0) return []

	const contentIds = rows.map((r) => r.id)

	const projectRows = await db
		.select()
		.from(projectExtension)
		.where(
			sql`${projectExtension.contentId} IN (${sql.join(
				contentIds.map((id) => sql`${id}`),
				sql`, `,
			)})`,
		)

	const mediaRows = await db
		.select()
		.from(mediaExtension)
		.where(
			sql`${mediaExtension.contentId} IN (${sql.join(
				contentIds.map((id) => sql`${id}`),
				sql`, `,
			)})`,
		)

	const projectMap = new Map(projectRows.map((p) => [p.contentId, p]))
	const mediaMap = new Map(mediaRows.map((m) => [m.contentId, m]))

	return Promise.all(
		rows.map(async (row): Promise<TimelineItem> => {
			const preview = truncateContent(row.content, PREVIEW_LENGTH)
			const contentHtml = await renderMarkdown(preview)

			const item: TimelineItem = {
				id: row.id,
				type: row.type as ContentType,
				title: row.title,
				contentHtml,
				summary: row.summary,
				tags: parseTags(row.tags),
				coverImage: row.coverImage,
				slug: row.slug,
				isPinned: row.isPinned,
				metadata: parseJson(row.metadata),
				createdAt: row.createdAt,
				publishedAt: row.publishedAt,
			}

			const proj = projectMap.get(row.id)
			if (proj) {
				item.project = {
					status: proj.status,
					demoUrl: proj.demoUrl,
					repoUrl: proj.repoUrl,
					techStack: parseTags(proj.techStack),
					role: proj.role,
				}
			}

			const med = mediaMap.get(row.id)
			if (med) {
				item.media = {
					mediaType: med.mediaType,
					rating: med.rating,
					creator: med.creator,
					cover: med.cover,
					year: med.year,
					comment: med.comment,
				}
			}

			return item
		}),
	)
}

export const getContentBySlug = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<ContentDetail | null> => {
		const input = data as { slug: string }
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')

		const [row] = await db
			.select()
			.from(baseContent)
			.where(eq(baseContent.slug, input.slug))
			.limit(1)
		if (!row) return null

		const contentHtml = await renderMarkdown(row.content)
		const detail: ContentDetail = {
			id: row.id,
			type: row.type as ContentType,
			title: row.title,
			contentHtml,
			summary: row.summary,
			tags: parseTags(row.tags),
			coverImage: row.coverImage,
			slug: row.slug,
			isPinned: row.isPinned,
			metadata: parseJson(row.metadata),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			publishedAt: row.publishedAt,
		}

		const [proj] = await db
			.select()
			.from(projectExtension)
			.where(eq(projectExtension.contentId, row.id))
			.limit(1)
		if (proj) {
			detail.project = {
				status: proj.status,
				demoUrl: proj.demoUrl,
				repoUrl: proj.repoUrl,
				techStack: parseTags(proj.techStack),
				screenshots: parseTags(proj.screenshots),
				role: proj.role,
			}
		}

		const [med] = await db
			.select()
			.from(mediaExtension)
			.where(eq(mediaExtension.contentId, row.id))
			.limit(1)
		if (med) {
			detail.media = {
				mediaType: med.mediaType,
				rating: med.rating,
				creator: med.creator,
				cover: med.cover,
				year: med.year,
				comment: med.comment,
				finishedAt: med.finishedAt,
			}
		}

		return detail
	},
)

export const getContentById = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<ContentDetail | null> => {
		const input = data as { id: string }
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')

		const [row] = await db.select().from(baseContent).where(eq(baseContent.id, input.id)).limit(1)
		if (!row) return null

		const contentHtml = await renderMarkdown(row.content)
		const detail: ContentDetail = {
			id: row.id,
			type: row.type as ContentType,
			title: row.title,
			contentHtml,
			summary: row.summary,
			tags: parseTags(row.tags),
			coverImage: row.coverImage,
			slug: row.slug,
			isPinned: row.isPinned,
			metadata: parseJson(row.metadata),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			publishedAt: row.publishedAt,
		}

		const [proj] = await db
			.select()
			.from(projectExtension)
			.where(eq(projectExtension.contentId, row.id))
			.limit(1)
		if (proj) {
			detail.project = {
				status: proj.status,
				demoUrl: proj.demoUrl,
				repoUrl: proj.repoUrl,
				techStack: parseTags(proj.techStack),
				screenshots: parseTags(proj.screenshots),
				role: proj.role,
			}
		}

		const [med] = await db
			.select()
			.from(mediaExtension)
			.where(eq(mediaExtension.contentId, row.id))
			.limit(1)
		if (med) {
			detail.media = {
				mediaType: med.mediaType,
				rating: med.rating,
				creator: med.creator,
				cover: med.cover,
				year: med.year,
				comment: med.comment,
				finishedAt: med.finishedAt,
			}
		}

		return detail
	},
)

export const getProjectsList = createServerFn({ method: 'GET' }).handler(
	async (): Promise<TimelineItem[]> => {
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')

		const rows = await db
			.select()
			.from(baseContent)
			.where(and(eq(baseContent.type, 'project'), eq(baseContent.isDraft, 0)))
			.orderBy(
				desc(baseContent.isPinned),
				desc(sql`coalesce(${baseContent.publishedAt}, ${baseContent.createdAt})`),
			)

		const items = await Promise.all(
			rows.map(async (row): Promise<TimelineItem> => {
				const preview = truncateContent(row.content, PREVIEW_LENGTH)
				const contentHtml = await renderMarkdown(preview)

				const [proj] = await db
					.select()
					.from(projectExtension)
					.where(eq(projectExtension.contentId, row.id))
					.limit(1)

				const item: TimelineItem = {
					id: row.id,
					type: 'project',
					title: row.title,
					contentHtml,
					summary: row.summary,
					tags: parseTags(row.tags),
					coverImage: row.coverImage,
					slug: row.slug,
					isPinned: row.isPinned,
					metadata: parseJson(row.metadata),
					createdAt: row.createdAt,
					publishedAt: row.publishedAt,
				}

				if (proj) {
					item.project = {
						status: proj.status,
						demoUrl: proj.demoUrl,
						repoUrl: proj.repoUrl,
						techStack: parseTags(proj.techStack),
						role: proj.role,
					}
				}

				return item
			}),
		)

		return items
	},
)

export const getMediaCollection = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<TimelineItem[]> => {
		const input = data as { mediaType?: string } | undefined
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')

		const rows = await db
			.select()
			.from(baseContent)
			.where(and(eq(baseContent.type, 'media'), eq(baseContent.isDraft, 0)))
			.orderBy(desc(sql`coalesce(${baseContent.publishedAt}, ${baseContent.createdAt})`))

		const items = await Promise.all(
			rows.map(async (row): Promise<TimelineItem> => {
				const contentHtml = await renderMarkdown(row.content)

				const [med] = await db
					.select()
					.from(mediaExtension)
					.where(eq(mediaExtension.contentId, row.id))
					.limit(1)

				if (input?.mediaType && med?.mediaType !== input.mediaType) {
					return null as unknown as TimelineItem
				}

				const item: TimelineItem = {
					id: row.id,
					type: 'media',
					title: row.title,
					contentHtml,
					summary: row.summary,
					tags: parseTags(row.tags),
					coverImage: row.coverImage,
					slug: row.slug,
					isPinned: row.isPinned,
					metadata: parseJson(row.metadata),
					createdAt: row.createdAt,
					publishedAt: row.publishedAt,
				}

				if (med) {
					item.media = {
						mediaType: med.mediaType,
						rating: med.rating,
						creator: med.creator,
						cover: med.cover,
						year: med.year,
						comment: med.comment,
					}
				}

				return item
			}),
		)

		return items.filter(Boolean)
	},
)
