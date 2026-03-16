import { asc } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import { links } from '~/server/database/schema'

export interface LinkItem {
	id: string
	name: string
	url: string
	avatar: string | null
	description: string | null
	category: string
}

export const getLinks = createServerFn({ method: 'GET' }).handler(async (): Promise<LinkItem[]> => {
	const db = getDb()
	const rows = await db.select().from(links).orderBy(asc(links.category), asc(links.name))

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		url: row.url,
		avatar: row.avatar,
		description: row.description,
		category: row.category,
	}))
})
