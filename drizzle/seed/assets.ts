/* drizzle/seed/assets.ts */

import { $ } from 'bun'
import { readdirSync } from 'node:fs'
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
