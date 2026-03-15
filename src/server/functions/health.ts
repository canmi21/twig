import { createServerFn } from '@tanstack/react-start'
import { seedPosts } from '~/server/database/seed'
import { getDb } from '~/server/database'

export const getPlatformStatus = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDb()

	// Seed posts on first request (idempotent)
	await seedPosts()

	return {
		ok: db !== null,
		generatedAt: new Date().toISOString(),
	}
})
