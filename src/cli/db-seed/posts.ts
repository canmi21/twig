/* src/cli/db-seed/posts.ts */

import { upsertPost } from '../../lib/database/posts'
import { compile } from '../../lib/compiler/index'
import { writePostKv, writePostIndex } from '../../lib/storage/kv'
import type { PostIndexEntry } from '../../lib/storage/kv'
import type { SeedContext } from './index'

export interface SeededPosts {
  published: string // cid
  draft: string // cid
}

const PUBLISHED_CID = 'seed-post-tools-we-deserve'
const DRAFT_CID = 'seed-post-draft-scratch'

const PUBLISHED_CONTENT = `\
The tools we reach for say a lot about what we value.

## Starting from scratch

Every project begins with a question: what do I actually need? Not what the ecosystem recommends, not what the last team used, but what this specific problem demands. The answer is almost always less than you think.

I spent years collecting tools before I learned to question them. Bundlers, linters, formatters, test runners, CI pipelines — each one justified on its own, but together they formed a maze. Half my time went to configuring things that were supposed to save me time.

## The turning point

It started with a [small rewrite](https://grugbrain.dev). I stripped a project down to its essentials: a compiler, a type checker, and a deploy script. Three tools. The build went from forty seconds to two. Debugging meant reading actual code instead of tracing through plugin layers.

The lesson was not that tools are bad. It was that each tool carries a cost, and that cost compounds. A formatter that fights your linter. A bundler plugin that breaks when the runtime updates. A test framework that needs its own config language. These are not edge cases — they are the norm.

## Choosing deliberately

Now I pick tools the way I pick dependencies: reluctantly. Every addition must justify itself against the alternative of writing ten lines of code. Most of the time, those ten lines win.

This does not mean rejecting progress. [Bun](https://bun.sh) replaced three tools for me. [oxlint](https://oxc.rs) runs in a fraction of the time ESLint takes. [Vite](https://vite.dev) made dev servers something you stop thinking about. Good tools disappear into the background. Bad tools demand your attention.

## What remains

The best development experience I have had was not the one with the most features. It was the one where I could hold the entire pipeline in my head. Where a change in one place did not cascade into three config files. Where the feedback loop was fast enough that I never lost my train of thought.

That is what tooling should be: invisible infrastructure. Not a hobby, not a personality, not a conversation topic. Just the thing that gets out of your way so you can build what matters.
`

const DRAFT_CONTENT = `\
A placeholder for something I have not figured out yet.

## Notes

This will probably turn into a post about local-first development, or maybe about the gap between what we plan and what we ship. For now it is just a reminder that not everything needs to be finished to exist.
`

export async function seedPosts(ctx: SeedContext): Promise<SeededPosts> {
  const now = new Date().toISOString()

  // Published post
  await upsertPost(ctx.db, {
    cid: PUBLISHED_CID,
    slug: 'tools-we-deserve',
    title: 'Tools we deserve',
    description: 'On choosing tools deliberately',
    category: 'engineering',
    tags: ['tooling', 'workflow'],
    content: PUBLISHED_CONTENT,
    contentHash: 'seed-hash-1',
    createdAt: now,
    updatedAt: now,
    published: true,
  })

  // Draft post
  await upsertPost(ctx.db, {
    cid: DRAFT_CID,
    slug: 'scratch-notes',
    title: 'Scratch notes',
    description: 'Unfinished thoughts',
    category: 'notes',
    tags: ['draft'],
    content: DRAFT_CONTENT,
    contentHash: 'seed-hash-2',
    createdAt: now,
    updatedAt: now,
    published: false,
  })

  // Compile and write to KV
  const index: PostIndexEntry[] = []

  for (const post of [
    {
      cid: PUBLISHED_CID,
      slug: 'tools-we-deserve',
      title: 'Tools we deserve',
      description: 'On choosing tools deliberately',
      category: 'engineering',
      tags: ['tooling', 'workflow'],
      content: PUBLISHED_CONTENT,
      published: true,
    },
    {
      cid: DRAFT_CID,
      slug: 'scratch-notes',
      title: 'Scratch notes',
      description: 'Unfinished thoughts',
      category: 'notes',
      tags: ['draft'],
      content: DRAFT_CONTENT,
      published: false,
    },
  ]) {
    const compiled = await compile(post.content)

    await writePostKv(ctx.kv, post.slug, {
      frontmatter: {
        title: post.title,
        description: post.description,
        category: post.category,
        tags: post.tags,
        cid: post.cid,
        created_at: now,
        updated_at: now,
        published: post.published,
      },
      html: compiled.html,
      toc: compiled.toc,
      components: compiled.components,
    })

    index.push({
      slug: post.slug,
      title: post.title,
      description: post.description,
      category: post.category,
      tags: post.tags,
      createdAt: now,
      updatedAt: now,
      published: post.published,
    })
  }

  await writePostIndex(ctx.kv, index)

  console.log(`  2 posts (1 published, 1 draft)`)
  return { published: PUBLISHED_CID, draft: DRAFT_CID }
}
