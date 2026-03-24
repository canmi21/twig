/* src/cli/pull.ts */

import { resolve } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { createDb } from '../lib/database/index'
import { getAllPosts } from '../lib/database/posts'
import { getMediaForPost } from '../lib/database/media'
import { storageKey } from '../lib/database/storage-key'
import { serializeFrontmatter } from '../lib/compiler/frontmatter'
import { createMiniflare, applyMigrations } from './local-env'

const ROOT = resolve(import.meta.dirname, '../..')
const POSTS_DIR = resolve(ROOT, 'contents/posts')

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('taki_sql')
    const r2 = (await mf.getR2Bucket('taki_bucket')) as unknown as R2Bucket

    await applyMigrations(d1)
    const db = createDb(d1)
    const rows = await getAllPosts(db)

    // Clean contents/posts/ before rebuilding
    await rm(POSTS_DIR, { recursive: true, force: true })

    for (const row of rows) {
      const tags = row.tags ? (JSON.parse(row.tags) as string[]) : undefined
      const header = serializeFrontmatter({
        cid: row.cid,
        title: row.title,
        description: row.description ?? undefined,
        category: row.category ?? undefined,
        tags,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        published: row.published === 1,
      })

      const dir = resolve(POSTS_DIR, row.slug)
      await mkdir(dir, { recursive: true })
      await writeFile(
        resolve(dir, 'index.md'),
        `${header}\n\n${row.content}\n`,
        'utf-8',
      )

      const mediaRows = await getMediaForPost(db, row.cid)
      for (const m of mediaRows) {
        const key = storageKey(m.hash, m.ext)
        const obj = await r2.get(key)
        if (!obj) continue
        const data = Buffer.from(await obj.arrayBuffer())
        await writeFile(resolve(dir, `${m.hash}.${m.ext}`), data)
      }
    }

    console.log(`pull complete: ${rows.length} posts exported`)
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
