/* drizzle/seed/assets.ts */

import { $ } from 'bun'
// oxlint-disable-next-line no-nodejs-modules -- seed script runs in Bun/Node, not browser
import { readdirSync } from 'node:fs'
// oxlint-disable-next-line no-nodejs-modules
import { join } from 'node:path'

const BUCKET_NAME = 'taki-bucket'
const SEED_DIR = join(import.meta.dir, 'public')

export async function seedAssets() {
	const files = readdirSync(SEED_DIR)
	for (const file of files) {
		const filePath = join(SEED_DIR, file)
		// oxlint-disable-next-line no-await-in-loop -- sequential to avoid R2 local state races
		await $`wrangler r2 object put ${BUCKET_NAME}/${file} --local --file ${filePath}`.quiet()
	}
	console.log('Seeded assets')
}
