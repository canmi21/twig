/* src/cli/watch/index.ts */

import { resolve, basename } from 'node:path'
import { watch } from 'node:fs'
import { createDb } from '../../lib/database/index'
import { createMiniflare, applyMigrations } from '../local-env'
import { pushCore, PushValidationError } from '../push/core'

const ROOT = resolve(import.meta.dirname, '../../..')
const POSTS_DIR = resolve(ROOT, 'contents/posts')
const DEBOUNCE_MS = 500

function shouldIgnore(filename: string): boolean {
  const name = basename(filename)
  return (
    name.startsWith('.') ||
    name.endsWith('~') ||
    name.endsWith('.swp') ||
    name.endsWith('.tmp')
  )
}

async function main() {
  const mf = createMiniflare()
  const d1 = await mf.getD1Database('CONTENT')
  const r2 = (await mf.getR2Bucket('BUCKET')) as unknown as R2Bucket
  const kv = (await mf.getKVNamespace('CACHE')) as unknown as KVNamespace

  await applyMigrations(d1)
  const db = createDb(d1)

  const pushOpts = { db, r2, kv, postsDir: POSTS_DIR }

  async function runPush() {
    try {
      const result = await pushCore(pushOpts)
      if (result.added === 0 && result.updated === 0 && result.deleted === 0) {
        console.log('push complete: no changes')
      } else {
        console.log(
          `push complete: ${result.added} added, ${result.updated} updated, ${result.deleted} deleted, ${result.unchanged} unchanged`,
        )
      }
    } catch (err) {
      if (err instanceof PushValidationError) {
        console.log('watch: validation failed, waiting for changes...')
      } else {
        console.error('watch: push failed', err)
      }
    }
  }

  let running = false
  let queued = false

  async function schedulePush() {
    if (running) {
      queued = true
      return
    }
    running = true
    await runPush()
    running = false
    if (queued) {
      queued = false
      await schedulePush()
    }
  }

  // Initial push to sync current state
  await schedulePush()

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const watcher = watch(POSTS_DIR, { recursive: true }, (_event, filename) => {
    if (filename && shouldIgnore(filename)) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      schedulePush()
    }, DEBOUNCE_MS)
  })

  console.log('watching contents/posts/ for changes...')

  process.on('SIGINT', async () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    watcher.close()
    await mf.dispose()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
