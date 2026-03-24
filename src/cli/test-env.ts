/* src/cli/test-env.ts */

import { resolve } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { Miniflare } from 'miniflare'
import { createDb } from '../lib/database/index'
import type { Db } from '../lib/database/index'
import { applyMigrations } from './local-env'

export interface TestEnv {
  mf: Miniflare
  db: Db
  d1: D1Database
  r2: R2Bucket
  kv: KVNamespace
  tmpDir: string
  postsDir: string
  cleanup: () => Promise<void>
}

export async function createTestEnv(): Promise<TestEnv> {
  const tmpDir = await mkdtemp(resolve(tmpdir(), 'taki-test-'))
  const postsDir = resolve(tmpDir, 'posts')

  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("") } }',
    d1Databases: { taki_sql: '5a58a081-29e1-4e96-ab6b-1f3f7370d654' },
    d1Persist: resolve(tmpDir, 'd1'),
    r2Buckets: { taki_bucket: 'taki-bucket' },
    r2Persist: resolve(tmpDir, 'r2'),
    kvNamespaces: { taki_kv: 'e823da6d6efe4ebfa7a33945530c2602' },
    kvPersist: resolve(tmpDir, 'kv'),
  })

  const d1 = await mf.getD1Database('taki_sql')
  const r2 = (await mf.getR2Bucket('taki_bucket')) as unknown as R2Bucket
  const kv = (await mf.getKVNamespace('taki_kv')) as unknown as KVNamespace

  await applyMigrations(d1)
  const db = createDb(d1)

  return {
    mf,
    db,
    d1,
    r2,
    kv,
    tmpDir,
    postsDir,
    cleanup: async () => {
      await mf.dispose()
      await rm(tmpDir, { recursive: true, force: true })
    },
  }
}

/** Truncate all tables in dependency order for test isolation. */
export async function truncateAll(d1: D1Database): Promise<void> {
  await d1.prepare('DELETE FROM media_refs').run()
  await d1.prepare('DELETE FROM posts').run()
  await d1.prepare('DELETE FROM contents').run()
  await d1.prepare('DELETE FROM media').run()
}
