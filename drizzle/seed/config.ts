import type { RunSql } from './types'

export async function seedConfig(runSql: RunSql) {
	await runSql(
		`INSERT OR REPLACE INTO config (key, value) VALUES ('site.title', 'Site Name'), ('site.description', 'A website description.'), ('site.url', 'https://example.com'), ('site.language', 'en')`,
	)
	console.log('Seeded config')
}
