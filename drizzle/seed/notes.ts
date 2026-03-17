/* drizzle/seed/notes.ts */

import type { RunSql } from './types'

export async function seedNotes(runSql: RunSql) {
	const cid = 'seed-note-001'
	const now = new Date().toISOString()
	await runSql(
		`INSERT OR REPLACE INTO contents (cid, type, status, created_at, updated_at) VALUES ('${cid}', 'note', 'published', '${now}', '${now}')`,
	)
	await runSql(
		`INSERT OR REPLACE INTO notes (cid, text) VALUES ('${cid}', 'First note on the new site. Short-form thoughts will live here alongside the longer posts.')`,
	)
	console.log('Seeded notes')
}
