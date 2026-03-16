import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database/client'
import { siteSettings } from '~/server/database/schema'

export interface SiteSettings {
	siteTitle: string
	siteDescription: string
	footerText: string
	copyright: string
}

const DEFAULTS: SiteSettings = {
	siteTitle: 'taki',
	siteDescription: 'A digital alter ego -- posts, projects, thoughts, and more.',
	footerText:
		'A digital alter ego -- posts, projects, thoughts, and more. Built with TanStack Start, deployed on Cloudflare Workers.',
	copyright: 'taki',
}

const SETTING_KEYS = Object.keys(DEFAULTS) as (keyof SiteSettings)[]

export const getSiteSettings = createServerFn({ method: 'GET' }).handler(
	async (): Promise<SiteSettings> => {
		const db = getDb()
		const rows = await db.select().from(siteSettings)
		const map = new Map(rows.map((r) => [r.key, r.value]))

		const result = { ...DEFAULTS }
		for (const key of SETTING_KEYS) {
			const val = map.get(key)
			if (val !== undefined) {
				result[key] = val
			}
		}
		return result
	},
)

export const saveSiteSettings = createServerFn({ method: 'POST' }).handler(
	async ({ data }): Promise<{ success: boolean }> => {
		const input = data as Partial<SiteSettings>
		const db = getDb()

		const entries = SETTING_KEYS.filter((k) => input[k] !== undefined).map((k) => ({
			key: k,
			value: input[k]!,
		}))

		for (const entry of entries) {
			const [existing] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, entry.key))
				.limit(1)

			if (existing) {
				await db
					.update(siteSettings)
					.set({ value: entry.value })
					.where(eq(siteSettings.key, entry.key))
			} else {
				await db.insert(siteSettings).values(entry)
			}
		}

		return { success: true }
	},
)
