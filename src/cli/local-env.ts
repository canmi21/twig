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
    d1Databases: { taki_sql: '5a58a081-29e1-4e96-ab6b-1f3f7370d654' },
    d1Persist: resolve(PERSIST_ROOT, 'd1'),
    r2Buckets: { taki_bucket: 'taki-bucket' },
    r2Persist: resolve(PERSIST_ROOT, 'r2'),
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
        if (!msg.includes('already exists')) throw err
      }
    }
  }
}
