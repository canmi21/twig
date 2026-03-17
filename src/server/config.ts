import { createServerFn } from '@tanstack/react-start'
import { eq, like } from 'drizzle-orm'
import { getDb } from '~/features/platform/server'
import { requireAuth } from '~/server/auth.server'
import { config } from '~/server/database'

export interface SiteConfig {
	title: string
	description: string
	url: string
	language: string
}

const SITE_DEFAULTS: Record<string, string> = {
	'site.title': 'Site Name',
	'site.description': 'A site built with Taki.',
	'site.url': 'https://example.com',
	'site.language': 'en',
}

function rowsToConfig(rows: { key: string; value: string }[]): SiteConfig {
	const map = new Map(rows.map((row) => [row.key, row.value]))
	return {
		title: map.get('site.title') ?? SITE_DEFAULTS['site.title'],
		description: map.get('site.description') ?? SITE_DEFAULTS['site.description'],
		url: map.get('site.url') ?? SITE_DEFAULTS['site.url'],
		language: map.get('site.language') ?? SITE_DEFAULTS['site.language'],
	}
}

export const getSiteConfig = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDb()
	const rows = await db.select().from(config).where(like(config.key, 'site.%'))
	return rowsToConfig(rows)
})

export const updateSiteConfig = createServerFn({ method: 'POST' })
	.inputValidator((d: Partial<SiteConfig>) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()

		const keyMap: Record<string, keyof SiteConfig> = {
			'site.title': 'title',
			'site.description': 'description',
			'site.url': 'url',
			'site.language': 'language',
		}

		const entries = Object.entries(keyMap)
			.filter(([_k, field]) => data[field] !== undefined)
			.map(([dbKey, field]) => ({ dbKey, value: data[field]! }))

		await Promise.all(
			entries.map(async ({ dbKey, value }) => {
				const updated = await db
					.update(config)
					.set({ value })
					.where(eq(config.key, dbKey))
					.returning()
				if (updated.length === 0) {
					await db.insert(config).values({ key: dbKey, value })
				}
			}),
		)
	})
