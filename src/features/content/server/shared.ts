import { sql } from 'drizzle-orm'
import { baseContent, mediaExtension, projectExtension } from '~/server/database/schema'

export const ITEMS_PER_PAGE = 12
export const CURSOR_LIMIT = 10
export const PREVIEW_LENGTH = 300

export const effectiveContentDate = sql`coalesce(${baseContent.publishedAt}, ${baseContent.createdAt})`

export type BaseContentRow = typeof baseContent.$inferSelect
export type ProjectExtensionRow = typeof projectExtension.$inferSelect
export type MediaExtensionRow = typeof mediaExtension.$inferSelect

export function parseTags(raw: string): string[] {
	try {
		return JSON.parse(raw) as string[]
	} catch {
		return []
	}
}

export function parseJson(raw: string): Record<string, unknown> {
	try {
		return JSON.parse(raw) as Record<string, unknown>
	} catch {
		return {}
	}
}

export function truncateContent(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text
	const truncated = text.slice(0, maxLen)
	const boundary = Math.max(truncated.lastIndexOf('\n'), truncated.lastIndexOf(' '))
	return (boundary > maxLen * 0.5 ? truncated.slice(0, boundary) : truncated) + '...'
}

export function joinSqlValues(values: string[]) {
	return sql.join(
		values.map((value) => sql`${value}`),
		sql`, `,
	)
}
