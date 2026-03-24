/* src/cli/pull.ts */

import { resolve } from 'node:path'
import { createDb } from '../lib/database/index'
import { createMiniflare, applyMigrations } from './local-env'
import { pullCore } from './pull-core'

const ROOT = resolve(import.meta.dirname, '../..')
const POSTS_DIR = resolve(ROOT, 'contents/posts')

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('taki_sql')
    const r2 = (await mf.getR2Bucket('taki_bucket')) as unknown as R2Bucket

    await applyMigrations(d1)
    const db = createDb(d1)

    const result = await pullCore({ db, r2, postsDir: POSTS_DIR })
    console.log(`pull complete: ${result.exported} posts exported`)
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
