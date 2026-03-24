/* src/cli/rebuild.ts */

import { createDb } from '../lib/database/index'
import { getAllPosts } from '../lib/database/posts'
import { compile } from '../lib/compiler/index'
import { writePostKv, writePostIndex } from '../lib/content/kv'
import type { PostIndexEntry } from '../lib/content/kv'
import { createMiniflare, applyMigrations } from './local-env'

async function main() {
  const mf = createMiniflare()

  try {
    const d1 = await mf.getD1Database('taki_sql')
    const kv = (await mf.getKVNamespace('taki_kv')) as unknown as KVNamespace

    await applyMigrations(d1)
    const db = createDb(d1)
    const rows = await getAllPosts(db)

    const index: PostIndexEntry[] = []

    for (const row of rows) {
      const tags = row.tags ? (JSON.parse(row.tags) as string[]) : undefined
      const frontmatter = {
        title: row.title,
        description: row.description ?? undefined,
        category: row.category ?? undefined,
        tags,
        cid: row.cid,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        published: row.published === 1,
      }

      const compiled = await compile(row.content)
      await writePostKv(kv, row.slug, {
        frontmatter,
        html: compiled.html,
        toc: compiled.toc,
        components: compiled.components,
      })

      index.push({
        slug: row.slug,
        title: row.title,
        description: row.description ?? undefined,
        category: row.category ?? undefined,
        tags,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        published: row.published === 1,
      })
    }

    await writePostIndex(kv, index)
    console.log(`rebuild complete: ${rows.length} posts compiled`)
  } finally {
    await mf.dispose()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
