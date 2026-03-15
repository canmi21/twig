import { createServerFn } from '@tanstack/react-start'
import { seedDatabase } from '~/server/database/seed'
import { getDb } from '~/server/database'

export const getPlatformStatus = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDb()

	// Seed database on first request (idempotent)
	await seedDatabase()

	return {
		ok: db !== null,
		generatedAt: new Date().toISOString(),
	}
})
