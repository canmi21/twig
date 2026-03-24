/* src/cli/pull/core.ts */

import { resolve } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import type { Db } from '../../lib/database/index'
import { getAllPosts } from '../../lib/database/posts'
import { getMediaForPost } from '../../lib/database/media'
import { storageKey } from '../../lib/storage/storage-key'
import { serializeFrontmatter } from '../../lib/compiler/frontmatter'

export interface PullResult {
  exported: number
}

export async function pullCore(opts: {
  db: Db
  r2: R2Bucket
  postsDir: string
}): Promise<PullResult> {
  const { db, r2, postsDir } = opts
  const rows = await getAllPosts(db)

  // Clean target directory before rebuilding
  await rm(postsDir, { recursive: true, force: true })

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

    const dir = resolve(postsDir, row.slug)
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

  return { exported: rows.length }
}
