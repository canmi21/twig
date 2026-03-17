/* drizzle/seed/posts.ts */

import type { RunSql } from './types'

export async function seedPosts(runSql: RunSql) {
	const cid = 'seed-post-001'
	const now = new Date().toISOString()
	await runSql(
		`INSERT OR REPLACE INTO contents (cid, type, status, created_at, updated_at) VALUES ('${cid}', 'post', 'published', '${now}', '${now}')`,
	)
	await runSql(
		`INSERT OR REPLACE INTO posts (cid, title, slug, content, summary, tags) VALUES ('${cid}', 'Hello World', 'hello-world', '# Hello World\n\nThis is the first post on the blog. It demonstrates **Markdown** rendering with code blocks, lists, and more.\n\n## Getting Started\n\nWelcome to Taki, a lightweight blogging platform built with TanStack Start and Cloudflare.', 'An introductory post demonstrating the blogging platform.', '["welcome","introduction"]')`,
	)
	console.log('Seeded posts')
}
