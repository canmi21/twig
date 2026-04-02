/* src/cli/rebuild/core.ts */

import type { Db } from '../../lib/database/index'
import { getAllPosts } from '../../lib/database/posts'
import { compile } from '../../lib/compiler/index'
import {
  writePostKv,
  writePostIndex,
  toPostIndexEntry,
} from '../../lib/storage/kv'
import type { PostIndexEntry } from '../../lib/storage/kv'

export interface RebuildResult {
  compiled: number
}

export async function rebuildCore(opts: {
  db: Db
  kv: KVNamespace
}): Promise<RebuildResult> {
  const { db, kv } = opts
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

    index.push(toPostIndexEntry(row))
  }

  await writePostIndex(kv, index)
  return { compiled: rows.length }
}
