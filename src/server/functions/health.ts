import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import { getDb } from '~/server/database'

export const getPlatformStatus = createServerFn({ method: 'GET' }).handler(() => {
	const db = typeof env.DB !== 'undefined' ? getDb() : null

	return {
		ok: true,
		generatedAt: new Date().toISOString(),
		bindings: {
			DB: db !== null,
			ASSETS: typeof env.ASSETS !== 'undefined',
			CACHE: typeof env.CACHE !== 'undefined',
		},
	}
})
