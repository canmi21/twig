import type { RunSql } from './types'

export async function seedConfig(runSql: RunSql) {
	await runSql(
		`INSERT OR REPLACE INTO config (key, value) VALUES
			('footer.description', 'A short text displayed in the site footer.'),
			('footer.name', 'Site Name'),
			('owner.bio', 'A short biography of the site owner.'),
			('owner.email', 'owner@example.com'),
			('owner.name', 'Owner Name'),
			('site.copyright', 'Site Name'),
			('site.description', 'A one-sentence description of the website.'),
			('site.icp', ''),
			('site.language', 'en'),
			('site.title', 'Site Name'),
			('site.url', 'https://example.com')`,
	)
	console.log('Seeded config')
}
