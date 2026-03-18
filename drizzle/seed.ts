/* drizzle/seed.ts */

import { $ } from 'bun'
import { seedAssets } from './seed/assets'
import { seedConfig } from './seed/config'
import { seedNotes } from './seed/notes'
import { seedPosts } from './seed/posts'

const DB_NAME = 'taki-sql'

async function runSql(sql: string) {
	await $`wrangler d1 execute ${DB_NAME} --local --command ${sql}`.quiet()
}

async function main() {
	await seedConfig(runSql)
	await seedPosts(runSql)
	await seedNotes(runSql)
	await seedAssets()
	console.log('Seed complete')
}

void main()
