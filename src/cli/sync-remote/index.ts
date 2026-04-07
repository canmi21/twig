/* src/cli/sync-remote/index.ts */

/* src/cli/sync-remote/index.ts
 *
 * Pull production D1 / R2 / KV into local miniflare persistence.
 * Requires `wrangler login` or CLOUDFLARE_API_TOKEN in env.
 */

import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createMiniflare } from '../local-env'
import { storageKey } from '../../lib/storage/storage-key'

const DDL_RE = /^(CREATE|DROP|ALTER)\s/i
const DML_RE = /^(INSERT|UPDATE|DELETE)\s/i

// Tables with no FK dependencies must be inserted before child tables.
// D1 enforces foreign_keys=ON and it cannot be disabled, so insert order matters.
const PARENT_TABLES = new Set([
  'd1_migrations',
  'contents',
  'media',
  'user',
  'verification',
])

function insertTable(stmt: string): string {
  const m = stmt.match(/^INSERT\s+INTO\s+"?([^"\s(]+)"?/i)
  return m ? m[1] : ''
}

const ROOT = resolve(import.meta.dirname, '../../..')
const PERSIST_ROOT = resolve(ROOT, '.wrangler/state/v3')

// Must match wrangler.jsonc bindings
const D1_DB = 'taki-sql'
const R2_BUCKET = 'taki-bucket'
const KV_NAMESPACE_ID = 'e823da6d6efe4ebfa7a33945530c2602'

const WRANGLER = resolve(ROOT, 'node_modules/.bin/wrangler')

/* ------------------------------------------------------------------ */

function run(args: string[]): void {
  execFileSync(WRANGLER, args, { cwd: ROOT, stdio: 'inherit' })
}

/** Run wrangler and return stdout, stripping informational prefixes. */
function capture(args: string[]): string {
  const raw = execFileSync(WRANGLER, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  })
  // Wrangler may print informational lines to stdout (e.g. "Proxy environment
  // variables detected...") before the actual payload. Drop non-empty lines
  // that appear before the first line starting with JSON-like content.
  const lines = raw.split('\n')
  const dataStart = lines.findIndex((l) => /^\s*[[{"]/.test(l))
  if (dataStart > 0) return lines.slice(dataStart).join('\n')
  return raw
}

/* ------------------------------------------------------------------ */

async function main() {
  const tmp = await mkdtemp(join(tmpdir(), 'taki-sync-'))

  try {
    // 1. Clear local persistence
    console.log('[1/5] clearing local state')
    for (const sub of ['d1', 'r2', 'kv']) {
      await rm(resolve(PERSIST_ROOT, sub), { recursive: true, force: true })
    }

    // 2. Export remote D1
    console.log('[2/5] exporting remote D1')
    const dumpPath = resolve(tmp, 'dump.sql')
    run(['d1', 'export', D1_DB, '--remote', `--output=${dumpPath}`])

    // 3. Import D1 via miniflare
    //    The dump relies on PRAGMA defer_foreign_keys which miniflare/wrangler
    //    --local don't fully support. Work around by executing all DDL (CREATE
    //    TABLE/INDEX) before any DML (INSERT), so every referenced table exists.
    console.log('[3/5] importing D1')
    const mf = createMiniflare()

    try {
      const d1 = await mf.getD1Database('CONTENT')
      const r2 = (await mf.getR2Bucket('BUCKET')) as unknown as R2Bucket
      const kv = (await mf.getKVNamespace('CACHE')) as unknown as KVNamespace

      const dumpSql = await readFile(dumpPath, 'utf-8')
      const statements = dumpSql
        .split(';\n')
        .map((s) => s.trim())
        .filter((s) => {
          if (!s) return false
          const u = s.toUpperCase()
          return (
            !u.startsWith('PRAGMA ') &&
            u !== 'BEGIN TRANSACTION' &&
            u !== 'BEGIN' &&
            u !== 'COMMIT' &&
            !u.includes('SQLITE_SEQUENCE')
          )
        })

      const ddl = statements.filter((s) => DDL_RE.test(s))
      const dml = statements.filter((s) => DML_RE.test(s))
      // Sort DML: parent tables first so FK constraints are satisfied
      dml.sort((a, b) => {
        const pa = PARENT_TABLES.has(insertTable(a)) ? 0 : 1
        const pb = PARENT_TABLES.has(insertTable(b)) ? 0 : 1
        return pa - pb
      })

      for (const stmt of ddl) {
        await d1.prepare(stmt).run()
      }
      // Batch DML for performance
      for (let i = 0; i < dml.length; i += 100) {
        await d1.batch(dml.slice(i, i + 100).map((s) => d1.prepare(s)))
      }
      console.log(`  ${ddl.length} DDL + ${dml.length} DML statements`)

      // 4. Sync R2 — keys derived from D1 media table
      console.log('[4/5] syncing R2')
      const { results: media } = await d1
        .prepare('SELECT hash, ext, mime FROM media')
        .all<{ hash: string; ext: string; mime: string }>()

      let r2Skipped = 0
      console.log(`  ${media.length} objects`)
      for (let i = 0; i < media.length; i++) {
        const { hash, ext, mime } = media[i]
        const key = storageKey(hash, ext)
        const file = resolve(tmp, `${hash}.${ext}`)
        console.log(`  [${i + 1}/${media.length}] ${key}`)
        try {
          execFileSync(
            WRANGLER,
            [
              'r2',
              'object',
              'get',
              `${R2_BUCKET}/${key}`,
              '--remote',
              `--file=${file}`,
            ],
            { cwd: ROOT, stdio: 'pipe' },
          )
          const data = new Uint8Array(await readFile(file))
          await r2.put(key, data, { httpMetadata: { contentType: mime } })
          await rm(file, { force: true })
        } catch {
          r2Skipped++
          console.warn(`  skip: ${key}`)
        }
      }

      // 5. Sync KV cache
      console.log('[5/5] syncing KV')
      const keysRaw = capture([
        'kv',
        'key',
        'list',
        `--namespace-id=${KV_NAMESPACE_ID}`,
        '--remote',
      ])
      // Strip wrangler informational output before JSON array
      const jsonStart = keysRaw.indexOf('[')
      const keys = JSON.parse(keysRaw.slice(jsonStart)) as Array<{
        name: string
      }>

      console.log(`  ${keys.length} entries`)
      for (let i = 0; i < keys.length; i++) {
        const { name } = keys[i]
        console.log(`  [${i + 1}/${keys.length}] ${name}`)
        try {
          const value = capture([
            'kv',
            'key',
            'get',
            `--namespace-id=${KV_NAMESPACE_ID}`,
            '--remote',
            name,
            '--text',
          ])
          await kv.put(name, value)
        } catch {
          console.warn(`  skip: ${name}`)
        }
      }

      console.log(
        `sync-remote complete: D1 ok, R2 ${media.length - r2Skipped}/${media.length}, KV ${keys.length}`,
      )
      await mf.dispose()
    } catch (err) {
      await mf.dispose()
      throw err
    }
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
