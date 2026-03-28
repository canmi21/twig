/* src/cli/db-seed/index.ts */

import { createDb } from '../../lib/database/index'
import { createMiniflare, applyMigrations } from '../local-env'
import { seedUsers } from './users'
import { seedPosts } from './posts'
import { seedComments } from './comments'

export interface SeedContext {
  db: ReturnType<typeof createDb>
  d1: D1Database
  r2: R2Bucket
  kv: KVNamespace
}

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('CONTENT')
    const r2 = (await mf.getR2Bucket('BUCKET')) as unknown as R2Bucket
    const kv = (await mf.getKVNamespace('CACHE')) as unknown as KVNamespace

    await applyMigrations(d1)
    const db = createDb(d1)

    const ctx: SeedContext = { db, d1, r2, kv }

    console.log('seeding users...')
    const userIds = await seedUsers(ctx)

    console.log('seeding posts...')
    const postCids = await seedPosts(ctx)

    console.log('seeding comments...')
    await seedComments(ctx, userIds, postCids)

    console.log('db:seed complete')
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
