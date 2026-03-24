/* src/cli/push/integration.test.ts */

import { resolve } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { stringify as stringifyYaml } from 'yaml'
import { createTestEnv, truncateAll, type TestEnv } from '../test-env'
import { pushCore, PushValidationError } from './core'
import { pullCore } from '../pull/core'
import { getAllPosts } from '../../lib/database/posts'
import { readPostKv, readPostIndex } from '../../lib/storage/kv'
import { storageKey } from '../../lib/storage/storage-key'

// --- Fixture helpers ---

interface PostFixture {
  title: string
  description?: string
  category: string
  tags?: string[]
  [key: string]: unknown
}

async function writePost(
  postsDir: string,
  slug: string,
  fm: PostFixture,
  content: string,
  media?: Array<{ name: string; data: Buffer }>,
): Promise<void> {
  const dir = resolve(postsDir, slug)
  await mkdir(dir, { recursive: true })
  const header = `---\n${stringifyYaml(fm).trimEnd()}\n---`
  await writeFile(
    resolve(dir, 'index.md'),
    `${header}\n\n${content}\n`,
    'utf-8',
  )
  if (media) {
    for (const { name, data } of media) {
      await writeFile(resolve(dir, name), data)
    }
  }
}

const POST_A: PostFixture = {
  title: 'Post A',
  description: 'First post',
  category: 'dev',
  tags: ['test'],
}

const POST_B: PostFixture = {
  title: 'Post B',
  description: 'Second post',
  category: 'dev',
  tags: ['demo'],
}

// --- Tests ---

describe('push integration', () => {
  let env: TestEnv

  beforeAll(async () => {
    env = await createTestEnv()
  })

  afterAll(async () => {
    await env.cleanup()
  })

  afterEach(async () => {
    await truncateAll(env.d1)
    // Clean KV by deleting known keys
    await env.kv.delete('post-index')
    // Clean postsDir
    await rm(env.postsDir, { recursive: true, force: true })
  })

  test('adds new posts to D1, KV, and post-index', async () => {
    await writePost(env.postsDir, 'post-a', POST_A, 'Content of post A.')
    await writePost(env.postsDir, 'post-b', POST_B, 'Content of post B.')

    const result = await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    expect(result).toEqual({ added: 2, updated: 0, deleted: 0, unchanged: 0 })

    const rows = await getAllPosts(env.db)
    expect(rows).toHaveLength(2)

    const kvA = await readPostKv(env.kv, 'post-a')
    expect(kvA).not.toBeNull()
    expect(kvA!.html).toContain('Content of post A.')

    const index = await readPostIndex(env.kv)
    expect(index).toHaveLength(2)
    expect(index.map((e) => e.slug).toSorted()).toEqual(['post-a', 'post-b'])
  })

  test('detects and applies content updates', async () => {
    await writePost(env.postsDir, 'post-a', POST_A, 'Original content.')
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    const rowsBefore = await getAllPosts(env.db)
    const hashBefore = rowsBefore[0].contentHash

    // Modify content
    await writePost(env.postsDir, 'post-a', POST_A, 'Updated content.')
    const result = await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    expect(result).toEqual({ added: 0, updated: 1, deleted: 0, unchanged: 0 })

    const rowsAfter = await getAllPosts(env.db)
    expect(rowsAfter[0].contentHash).not.toBe(hashBefore)

    const kv = await readPostKv(env.kv, 'post-a')
    expect(kv!.html).toContain('Updated content.')
  })

  test('detects and deletes removed posts', async () => {
    await writePost(env.postsDir, 'post-a', POST_A, 'A content.')
    await writePost(env.postsDir, 'post-b', POST_B, 'B content.')
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    // Remove post-b
    await rm(resolve(env.postsDir, 'post-b'), { recursive: true })
    const result = await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    expect(result).toEqual({ added: 0, updated: 0, deleted: 1, unchanged: 1 })

    const rows = await getAllPosts(env.db)
    expect(rows).toHaveLength(1)
    expect(rows[0].slug).toBe('post-a')

    expect(await readPostKv(env.kv, 'post-b')).toBeNull()

    const index = await readPostIndex(env.kv)
    expect(index).toHaveLength(1)
  })

  test('reports no changes when content is identical', async () => {
    await writePost(env.postsDir, 'post-a', POST_A, 'Static content.')
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    const result = await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    expect(result).toEqual({ added: 0, updated: 0, deleted: 0, unchanged: 1 })
  })

  test('handles media files: upload to R2 and rewrite references', async () => {
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])

    await writePost(
      env.postsDir,
      'post-media',
      { title: 'Media Post', category: 'dev' },
      '::image{src="./photo.png" alt="test"}',
      [{ name: 'photo.png', data: pngData }],
    )

    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    // Check media table
    const mediaRows = await env.d1
      .prepare('SELECT * FROM media')
      .all<{ hash: string; ext: string }>()
    expect(mediaRows.results).toHaveLength(1)
    expect(mediaRows.results[0].ext).toBe('png')

    // Check media_refs
    const refs = await env.d1
      .prepare('SELECT * FROM media_refs')
      .all<{ hash: string; cid: string }>()
    expect(refs.results).toHaveLength(1)

    // Check R2 has the file
    const hash = mediaRows.results[0].hash
    const r2Obj = await env.r2.get(storageKey(hash, 'png'))
    expect(r2Obj).not.toBeNull()

    // Check content has rewritten reference
    const rows = await getAllPosts(env.db)
    expect(rows[0].content).toContain(`${hash}.png`)
    expect(rows[0].content).not.toContain('./photo.png')
  })

  test('deduplicates shared media across posts', async () => {
    const sharedData = Buffer.from('shared-media-bytes')

    await writePost(
      env.postsDir,
      'post-x',
      { title: 'Post X', category: 'dev' },
      '::image{src="./shared.png" alt="x"}',
      [{ name: 'shared.png', data: sharedData }],
    )
    await writePost(
      env.postsDir,
      'post-y',
      { title: 'Post Y', category: 'dev' },
      '::image{src="./shared.png" alt="y"}',
      [{ name: 'shared.png', data: sharedData }],
    )

    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    // media table: 1 row (deduplicated)
    const media = await env.d1.prepare('SELECT * FROM media').all()
    expect(media.results).toHaveLength(1)

    // media_refs: 2 rows
    const refs = await env.d1.prepare('SELECT * FROM media_refs').all()
    expect(refs.results).toHaveLength(2)

    // Delete one post, media should survive
    await rm(resolve(env.postsDir, 'post-x'), { recursive: true })
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    const mediaAfter1 = await env.d1.prepare('SELECT * FROM media').all()
    expect(mediaAfter1.results).toHaveLength(1)

    // Delete the other post, media should be cleaned up
    await rm(resolve(env.postsDir, 'post-y'), { recursive: true })
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    const mediaAfter2 = await env.d1.prepare('SELECT * FROM media').all()
    expect(mediaAfter2.results).toHaveLength(0)
  })

  test('pull then push is idempotent', async () => {
    await writePost(env.postsDir, 'post-a', POST_A, 'Round-trip content.')
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    // Pull to a different directory, then push from there
    const pullDir = resolve(env.tmpDir, 'pulled')
    await pullCore({ db: env.db, r2: env.r2, postsDir: pullDir })

    const result = await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: pullDir,
    })

    expect(result).toEqual({ added: 0, updated: 0, deleted: 0, unchanged: 1 })
  })

  test('throws PushValidationError on invalid post', async () => {
    // Missing category (required field)
    const dir = resolve(env.postsDir, 'bad-post')
    await mkdir(dir, { recursive: true })
    await writeFile(
      resolve(dir, 'index.md'),
      '---\ntitle: Bad\n---\n\nContent.\n',
      'utf-8',
    )

    const rowsBefore = await getAllPosts(env.db)

    await expect(
      pushCore({ db: env.db, r2: env.r2, kv: env.kv, postsDir: env.postsDir }),
    ).rejects.toThrow(PushValidationError)

    // DB unchanged
    const rowsAfter = await getAllPosts(env.db)
    expect(rowsAfter).toEqual(rowsBefore)
  })
})
