/* src/cli/pull.ts */

import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
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

    console.log('Applying migrations...')
    await applyMigrations(d1)

    const db = createDb(d1)
    const rows = await getAllPosts(db)

    if (rows.length === 0) {
      console.log('No posts in database.')
      return
    }

    console.log(`Found ${rows.length} post(s)\n`)

    for (const row of rows) {
      const tags = row.tags ? (JSON.parse(row.tags) as string[]) : undefined

      const header = serializeFrontmatter({
        title: row.title,
        description: row.description ?? undefined,
        category: row.category ?? undefined,
        tags,
      })

      const file = `${header}\n\n${row.content}\n`

      const dir = resolve(POSTS_DIR, row.slug)
      await mkdir(dir, { recursive: true })
      await writeFile(resolve(dir, 'index.md'), file, 'utf-8')
      console.log(`  wrote: ${row.slug}/index.md`)

      // Pull associated media files
      const mediaRows = await getMediaForPost(db, row.cid)
      for (const m of mediaRows) {
        const key = storageKey(m.hash, m.ext)
        const obj = await r2.get(key)
        if (!obj) {
          console.log(`    media missing in R2: ${key}`)
          continue
        }
        const data = Buffer.from(await obj.arrayBuffer())
        const filename = `${m.hash}.${m.ext}`
        await writeFile(resolve(dir, filename), data)
        console.log(`    media: ${filename}`)
      }
    }
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
