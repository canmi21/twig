/* drizzle/seed/config.ts */

import type { RunSql } from './types'

const FOOTER_NAV = JSON.stringify([
	{
		title: 'About',
		links: [
			{ label: 'Myself', href: '/about' },
			{ label: 'Website', href: '/about/site' },
			{ label: 'Project', href: '/about/project' },
		],
	},
	{
		title: 'Contact',
		links: [
			{ label: 'Email', href: 'mailto:owner@example.com' },
			{ label: 'Message', href: '/guestbook' },
			{ label: 'Twitter', href: 'https://twitter.com' },
		],
	},
	{
		title: 'More',
		links: [
			{ label: 'Projects', href: '/projects' },
			{ label: 'Photos', href: '/photos' },
			{ label: 'Explore', href: '/explore' },
		],
	},
])

export async function seedConfig(runSql: RunSql) {
	await runSql(
		`INSERT OR REPLACE INTO config (key, value) VALUES
			('footer.description', 'A short text displayed in the site footer.'),
			('footer.name', 'Site Name'),
			('footer.nav', '${FOOTER_NAV.replaceAll("'", "''")}'),
			('owner.bio', 'A short biography of the site owner.'),
			('owner.email', 'owner@example.com'),
			('owner.name', 'Owner Name'),
			('site.copyright', 'Site Name'),
			('site.description', 'A one-sentence description of the website.'),
			('site.icp', ''),
			('site.icp.link', ''),
			('site.language', 'en'),
			('site.title', 'Site Name'),
			('site.url', 'https://example.com')`,
	)
	console.log('Seeded config')
}