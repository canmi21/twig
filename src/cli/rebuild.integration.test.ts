/* src/cli/rebuild.integration.test.ts */

import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { stringify as stringifyYaml } from 'yaml'
import { createTestEnv, truncateAll, type TestEnv } from './test-env'
import { pushCore } from './push-core'
import { rebuildCore } from './rebuild-core'
import { readPostKv, readPostIndex } from '../lib/content/kv'

describe('rebuild integration', () => {
  let env: TestEnv

  beforeAll(async () => {
    env = await createTestEnv()
  })

  afterAll(async () => {
    await env.cleanup()
  })

  afterEach(async () => {
    await truncateAll(env.d1)
    await env.kv.delete('post-index')
  })

  async function seedPost(slug: string, title: string, content: string) {
    const dir = resolve(env.postsDir, slug)
    await mkdir(dir, { recursive: true })
    const fm = stringifyYaml({ title, category: 'dev' }).trimEnd()
    await writeFile(
      resolve(dir, 'index.md'),
      `---\n${fm}\n---\n\n${content}\n`,
      'utf-8',
    )
  }

  test('recompiles all posts and refreshes KV', async () => {
    await seedPost('alpha', 'Alpha', 'Alpha content.')
    await seedPost('beta', 'Beta', 'Beta content.')
    await pushCore({
      db: env.db,
      r2: env.r2,
      kv: env.kv,
      postsDir: env.postsDir,
    })

    // Verify KV is populated after push
    expect(await readPostKv(env.kv, 'alpha')).not.toBeNull()

    // Clear KV manually
    await env.kv.delete('post:alpha')
    await env.kv.delete('post:beta')
    await env.kv.delete('post-index')

    // Rebuild
    const result = await rebuildCore({ db: env.db, kv: env.kv })
    expect(result.compiled).toBe(2)

    // Verify KV is repopulated
    const kvAlpha = await readPostKv(env.kv, 'alpha')
    expect(kvAlpha).not.toBeNull()
    expect(kvAlpha!.html).toContain('Alpha content.')

    const kvBeta = await readPostKv(env.kv, 'beta')
    expect(kvBeta).not.toBeNull()

    const index = await readPostIndex(env.kv)
    expect(index).toHaveLength(2)
  })

  test('handles empty database', async () => {
    const result = await rebuildCore({ db: env.db, kv: env.kv })

    expect(result.compiled).toBe(0)

    const index = await readPostIndex(env.kv)
    expect(index).toEqual([])
  })
})
