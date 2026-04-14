/* src/cli/pull/integration.test.ts */

import { resolve } from 'node:path'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { createTestEnv, truncateAll, type TestEnv } from '../test-env'
import { pullCore } from './core'
import { upsertPost } from '../../lib/database/posts'
import { insertMedia, upsertMediaRef } from '../../lib/database/media'
import { storageKey } from '../../lib/storage/storage-key'

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

    // pullCore writes posts under {postsDir}/{category}/{slug}/ to mirror
    // the layout push scans from. Verify the nested structure explicitly.
    const topLevel = await readdir(pullDir)
    expect(topLevel).toContain('dev')

    const slugDirs = await readdir(resolve(pullDir, 'dev'))
    expect(slugDirs).toContain('test-post')

    // Check frontmatter
    const md = await readFile(
      resolve(pullDir, 'dev', 'test-post', 'index.md'),
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
      resolve(pullDir, 'dev', 'test-post', `${mediaHash}.png`),
    )
    expect(mediaFile).toEqual(mediaData)
  })

  test('clears existing directory before writing', async () => {
    // Seed a stale file inside the (to-be-wiped) pull directory. The
    // path layout does not matter for the cleanup check; what matters is
    // that the file exists before pullCore runs.
    const pullDir = resolve(env.tmpDir, 'pull-stale')
    const staleDir = resolve(pullDir, 'old-category', 'old-post')
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

    // After cleanup the top level only contains the new category dir.
    const topLevel = await readdir(pullDir)
    expect(topLevel).toEqual(['dev'])
    expect(topLevel).not.toContain('old-category')

    const slugDirs = await readdir(resolve(pullDir, 'dev'))
    expect(slugDirs).toEqual(['fresh-post'])
  })
})
