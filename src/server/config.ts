import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { getDb } from '~/features/platform/server'
import { requireAuth } from '~/server/auth.server'
import { config } from '~/server/database'

export interface SiteConfig {
	copyright: string
	description: string
	footerDescription: string
	footerName: string
	icp: string
	language: string
	ownerBio: string
	ownerEmail: string
	ownerName: string
	title: string
	url: string
}

const CONFIG_DEFAULTS: Record<string, string> = {
	'footer.description': 'A short text displayed in the site footer.',
	'footer.name': 'Site Name',
	'owner.bio': 'A short biography of the site owner.',
	'owner.email': 'owner@example.com',
	'owner.name': 'Owner Name',
	'site.copyright': 'Site Name',
	'site.description': 'A one-sentence description of the website.',
	'site.icp': '',
	'site.language': 'en',
	'site.title': 'Site Name',
	'site.url': 'https://example.com',
}

/** Map from DB key to SiteConfig field name. */
const KEY_MAP: Record<string, keyof SiteConfig> = {
	'footer.description': 'footerDescription',
	'footer.name': 'footerName',
	'owner.bio': 'ownerBio',
	'owner.email': 'ownerEmail',
	'owner.name': 'ownerName',
	'site.copyright': 'copyright',
	'site.description': 'description',
	'site.icp': 'icp',
	'site.language': 'language',
	'site.title': 'title',
	'site.url': 'url',
}

function rowsToConfig(rows: { key: string; value: string }[]): SiteConfig {
	const map = new Map(rows.map((row) => [row.key, row.value]))
	const result = {} as Record<string, string>
	for (const [dbKey, field] of Object.entries(KEY_MAP)) {
		result[field] = map.get(dbKey) ?? CONFIG_DEFAULTS[dbKey]
	}
	return result as unknown as SiteConfig
}

export const getSiteConfig = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDb()
	const rows = await db.select().from(config)
	return rowsToConfig(rows)
})

export const updateSiteConfig = createServerFn({ method: 'POST' })
	.inputValidator((d: Partial<SiteConfig>) => d)
	.handler(async ({ data }) => {
		await requireAuth()
		const db = getDb()

		const entries = Object.entries(KEY_MAP)
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
