/* src/cli/rebuild/index.ts */

import { createDb } from '../../lib/database/index'
import { createMiniflare, applyMigrations } from '../local-env'
import { rebuildCore } from './core'

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('taki_sql')
    const kv = (await mf.getKVNamespace('taki_kv')) as unknown as KVNamespace

    await applyMigrations(d1)
    const db = createDb(d1)

    const result = await rebuildCore({ db, kv })
    console.log(`rebuild complete: ${result.compiled} posts compiled`)
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
