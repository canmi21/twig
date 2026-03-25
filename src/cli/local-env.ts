/* src/cli/local-env.ts */

import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'

const ROOT = resolve(import.meta.dirname, '../..')
const PERSIST_ROOT = resolve(ROOT, '.wrangler/state/v3')
const MIGRATIONS_DIR = resolve(ROOT, 'drizzle/migrations')

export function createMiniflare() {
  return new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("") } }',
    d1Databases: { CONTENT: '488012b4-4ab2-4a4c-99ac-33dc0e197615' },
    d1Persist: resolve(PERSIST_ROOT, 'd1'),
    r2Buckets: { BUCKET: 'taki-bucket' },
    r2Persist: resolve(PERSIST_ROOT, 'r2'),
    kvNamespaces: { CACHE: 'e823da6d6efe4ebfa7a33945530c2602' },
    kvPersist: resolve(PERSIST_ROOT, 'kv'),
  })
}

export async function applyMigrations(d1: D1Database) {
  const metaPath = resolve(MIGRATIONS_DIR, 'meta/_journal.json')
  const journal = JSON.parse(await readFile(metaPath, 'utf-8')) as {
    entries: Array<{ tag: string }>
  }

  for (const entry of journal.entries) {
    const sql = await readFile(
      resolve(MIGRATIONS_DIR, `${entry.tag}.sql`),
      'utf-8',
    )

    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const stmt of statements) {
      try {
        await d1.prepare(stmt).run()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // Tolerate re-running migrations: CREATE → "already exists", ALTER ADD → "duplicate column"
        if (
          !msg.includes('already exists') &&
          !msg.includes('duplicate column name')
        )
          throw err
      }
    }
  }
}
