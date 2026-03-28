/* src/cli/db-reset/index.ts */

import { createMiniflare, applyMigrations } from '../local-env'

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('CONTENT')
    const r2 = (await mf.getR2Bucket('BUCKET')) as unknown as R2Bucket
    const kv = (await mf.getKVNamespace('CACHE')) as unknown as KVNamespace

    // Truncate content tables (FK-safe order)
    console.log('truncating content tables...')
    await d1.prepare('DELETE FROM comments').run()
    await d1.prepare('DELETE FROM media_refs').run()
    await d1.prepare('DELETE FROM posts').run()
    await d1.prepare('DELETE FROM contents').run()
    await d1.prepare('DELETE FROM media').run()

    // Truncate auth tables (FK-safe order)
    console.log('truncating auth tables...')
    await d1.prepare('DELETE FROM session').run()
    await d1.prepare('DELETE FROM account').run()
    await d1.prepare('DELETE FROM verification').run()
    await d1.prepare('DELETE FROM user').run()

    // Clear R2
    console.log('clearing R2...')
    let r2Listed = await r2.list()
    while (r2Listed.objects.length > 0) {
      await Promise.all(r2Listed.objects.map((obj) => r2.delete(obj.key)))
      if (r2Listed.truncated) {
        r2Listed = await r2.list({ cursor: r2Listed.cursor })
      } else {
        break
      }
    }

    // Clear KV
    console.log('clearing KV...')
    let kvListed = await kv.list()
    while (kvListed.keys.length > 0) {
      await Promise.all(kvListed.keys.map((k) => kv.delete(k.name)))
      if (!kvListed.list_complete) {
        kvListed = await kv.list({ cursor: kvListed.cursor })
      } else {
        break
      }
    }

    // Re-apply migrations
    console.log('re-applying migrations...')
    await applyMigrations(d1)

    console.log('db:reset complete')
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
