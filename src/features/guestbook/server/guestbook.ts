import { desc, count } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import { guestbookEntries } from '~/server/database/schema'

const ENTRIES_PER_PAGE = 20

export interface GuestbookEntry {
	id: string
	nickname: string
	avatar: string | null
	content: string
	website: string | null
	createdAt: string
}

export interface PaginatedGuestbook {
	entries: GuestbookEntry[]
	totalPages: number
	currentPage: number
}

export const getGuestbookEntries = createServerFn({ method: 'GET' }).handler(
	async ({ data }): Promise<PaginatedGuestbook> => {
		const input = data as { page?: number } | undefined
		const page = Math.max(1, input?.page ?? 1)
		const db = getDb()

		const [{ total }] = await db.select({ total: count() }).from(guestbookEntries)
		const totalPages = Math.max(1, Math.ceil(total / ENTRIES_PER_PAGE))
		const offset = (page - 1) * ENTRIES_PER_PAGE

		const rows = await db
			.select()
			.from(guestbookEntries)
			.orderBy(desc(guestbookEntries.createdAt))
			.limit(ENTRIES_PER_PAGE)
			.offset(offset)

		return {
			entries: rows.map((row) => ({
				id: row.id,
				nickname: row.nickname,
				avatar: row.avatar,
				content: row.content,
				website: row.website,
				createdAt: row.createdAt,
			})),
			totalPages,
			currentPage: page,
		}
	},
)

export const createGuestbookEntry = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ success: boolean; error?: string }> => {
		const input = data as { nickname?: string; content?: string; website?: string }

		const nickname = input.nickname?.trim()
		const content = input.content?.trim()
		const website = input.website?.trim() || null

		if (!nickname || nickname.length < 1 || nickname.length > 50) {
			return { success: false, error: 'Nickname must be 1-50 characters.' }
		}
		if (!content || content.length < 1 || content.length > 500) {
			return { success: false, error: 'Message must be 1-500 characters.' }
		}
		if (website && website.length > 200) {
			return { success: false, error: 'Website URL must be under 200 characters.' }
		}

		const db = getDb()
		await db.insert(guestbookEntries).values({
			id: crypto.randomUUID(),
			nickname,
			content,
			website,
			createdAt: new Date().toISOString(),
		})

		return { success: true }
	},
)
