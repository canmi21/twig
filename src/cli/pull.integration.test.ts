/* src/cli/pull.integration.test.ts */

import { resolve } from 'node:path'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { createTestEnv, truncateAll, type TestEnv } from './test-env'
import { pullCore } from './pull-core'
import { upsertPost } from '../lib/database/posts'
import { insertMedia, upsertMediaRef } from '../lib/database/media'
import { storageKey } from '../lib/database/storage-key'

describe('pull integration', () => {
  let env: TestEnv

  beforeAll(async () => {
    env = await createTestEnv()
  })

  afterAll(async () => {
    await env.cleanup()
  })

  afterEach(async () => {
    await truncateAll(env.d1)
  })

  test('exports posts with full frontmatter and media files', async () => {
    // Seed DB directly
    const result = await upsertPost(env.db, {
      slug: 'test-post',
      title: 'Test Post',
      description: 'A test',
      category: 'dev',
      tags: ['alpha'],
      content: 'Hello world.',
      contentHash: 'fakehash',
    })

    // Seed media
    const mediaHash = 'a'.repeat(64)
    const mediaData = Buffer.from('fake-image-data')
    await insertMedia(env.db, {
      hash: mediaHash,
      ext: 'png',
      mime: 'image/png',
      size: mediaData.length,
      createdAt: new Date().toISOString(),
    })
    await upsertMediaRef(env.db, mediaHash, result.cid)
    await env.r2.put(storageKey(mediaHash, 'png'), new Uint8Array(mediaData))

    // Pull
    const pullDir = resolve(env.tmpDir, 'pull-output')
    const pullResult = await pullCore({
      db: env.db,
      r2: env.r2,
      postsDir: pullDir,
    })
    expect(pullResult.exported).toBe(1)

    // Check directory structure
    const slugDirs = await readdir(pullDir)
    expect(slugDirs).toContain('test-post')

    // Check frontmatter
    const md = await readFile(
      resolve(pullDir, 'test-post', 'index.md'),
      'utf-8',
    )
    expect(md).toContain('cid:')
    expect(md).toContain('title: Test Post')
    expect(md).toContain('created_at:')
    expect(md).toContain('updated_at:')
    expect(md).toContain('published: false')
    expect(md).toContain('Hello world.')

    // Check media file
    const mediaFile = await readFile(
      resolve(pullDir, 'test-post', `${mediaHash}.png`),
    )
    expect(mediaFile).toEqual(mediaData)
  })

  test('clears existing directory before writing', async () => {
    // Create stale file
    const pullDir = resolve(env.tmpDir, 'pull-stale')
    const staleDir = resolve(pullDir, 'old-post')
    await mkdir(staleDir, { recursive: true })
    await writeFile(resolve(staleDir, 'index.md'), 'stale', 'utf-8')

    // Seed DB with one different post
    await upsertPost(env.db, {
      slug: 'fresh-post',
      title: 'Fresh',
      category: 'dev',
      content: 'New content.',
      contentHash: 'hash',
    })

    await pullCore({ db: env.db, r2: env.r2, postsDir: pullDir })

    const dirs = await readdir(pullDir)
    expect(dirs).toEqual(['fresh-post'])
    expect(dirs).not.toContain('old-post')
  })
})
