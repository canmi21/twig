/* src/cli/push/index.ts */

import { resolve } from 'node:path'
import { createDb } from '../../lib/database/index'
import { createMiniflare, applyMigrations } from '../local-env'
import { pushCore, PushValidationError } from './core'

const ROOT = resolve(import.meta.dirname, '../../..')
const POSTS_DIR = resolve(ROOT, 'contents/posts')

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('CONTENT')
    const r2 = (await mf.getR2Bucket('BUCKET')) as unknown as R2Bucket
    const kv = (await mf.getKVNamespace('CACHE')) as unknown as KVNamespace

    await applyMigrations(d1)
    const db = createDb(d1)

    const result = await pushCore({ db, r2, kv, postsDir: POSTS_DIR })

    if (result.added === 0 && result.updated === 0 && result.deleted === 0) {
      console.log('push complete: no changes')
    } else {
      console.log(
        `push complete: ${result.added} added, ${result.updated} updated, ${result.deleted} deleted, ${result.unchanged} unchanged`,
      )
    }
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  if (err instanceof PushValidationError) {
    process.exit(1)
  }
  console.error(err)
  process.exit(1)
})
