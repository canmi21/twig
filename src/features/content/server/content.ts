import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import { buildContentDetail, buildTimelineItems, createContentExtensionMaps } from './mappers'
import {
	fetchContentById,
	fetchContentBySlug,
	fetchContentDetailExtensions,
	fetchContentExtensions,
	fetchPublishedMedia,
	fetchPublishedProjects,
	fetchTimelineCursorRows,
	fetchTimelinePageRows,
} from './queries'
import { CURSOR_LIMIT, ITEMS_PER_PAGE } from './shared'
import type { ContentDetail, CursorTimeline, PaginatedTimeline, TimelineItem } from './types'

export type { ContentDetail, CursorTimeline, PaginatedTimeline, TimelineItem } from './types'

export const getTimelineItems = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<PaginatedTimeline> => {
		const input = data as { page?: number; type?: string; tag?: string } | undefined
		const page = Math.max(1, input?.page ?? 1)
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')
		const { rows, total } = await fetchTimelinePageRows(db, {
			page,
			type: input?.type,
			tag: input?.tag,
		})
		const { projectRows, mediaRows } = await fetchContentExtensions(
			db,
			rows.map((row) => row.id),
		)
		const items = await buildTimelineItems(
			rows,
			renderMarkdown,
			createContentExtensionMaps(projectRows, mediaRows),
		)

		return {
			items,
			totalPages: Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)),
			currentPage: page,
		}
	},
)

export const getTimelineCursor = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<CursorTimeline> => {
		const input = data as { cursor?: string; limit?: number; until?: string } | undefined
		const limit = input?.limit ?? CURSOR_LIMIT
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')
		const rows = await fetchTimelineCursorRows(db, {
			cursor: input?.cursor,
			limit,
			until: input?.until,
		})
		const hasMore = rows.length > limit
		const slicedRows = rows.slice(0, limit)
		const { projectRows, mediaRows } = await fetchContentExtensions(
			db,
			slicedRows.map((row) => row.id),
		)
		const items = await buildTimelineItems(
			slicedRows,
			renderMarkdown,
			createContentExtensionMaps(projectRows, mediaRows),
		)
		const last = slicedRows[slicedRows.length - 1]

		return {
			items,
			nextCursor: hasMore && last ? `${last.publishedAt ?? last.createdAt}__${last.id}` : null,
		}
	},
)

export const getContentBySlug = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<ContentDetail | null> => {
		const input = data as { slug: string }
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')
		const row = await fetchContentBySlug(db, input.slug)
		if (!row) return null

		const { projectRow, mediaRow } = await fetchContentDetailExtensions(db, row.id)
		return buildContentDetail(row, renderMarkdown, projectRow, mediaRow)
	},
)

export const getContentById = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<ContentDetail | null> => {
		const input = data as { id: string }
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')
		const row = await fetchContentById(db, input.id)
		if (!row) return null

		const { projectRow, mediaRow } = await fetchContentDetailExtensions(db, row.id)
		return buildContentDetail(row, renderMarkdown, projectRow, mediaRow)
	},
)

export const getProjectsList = createServerFn({ method: 'GET' }).handler(
	async (): Promise<TimelineItem[]> => {
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')
		const rows = await fetchPublishedProjects(db)
		const { projectRows, mediaRows } = await fetchContentExtensions(
			db,
			rows.map((row) => row.id),
		)

		return buildTimelineItems(
			rows,
			renderMarkdown,
			createContentExtensionMaps(projectRows, mediaRows),
		)
	},
)

export const getMediaCollection = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<TimelineItem[]> => {
		const input = data as { mediaType?: string } | undefined
		const db = getDb()
		const { renderMarkdown } = await import('~/server/markdown')
		const rows = await fetchPublishedMedia(db)
		const { projectRows, mediaRows } = await fetchContentExtensions(
			db,
			rows.map((row) => row.id),
		)
		const extensionMaps = createContentExtensionMaps(projectRows, mediaRows)
		const filteredRows = input?.mediaType
			? rows.filter((row) => extensionMaps.mediaMap.get(row.id)?.mediaType === input.mediaType)
			: rows

		return buildTimelineItems(filteredRows, renderMarkdown, extensionMaps, {
			mode: 'full',
		})
	},
)
