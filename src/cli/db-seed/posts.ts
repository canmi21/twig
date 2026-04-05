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
const CHINESE_CID = 'seed-post-chinese-typography'
const COMPONENTS_CID = 'seed-post-component-showcase'
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

const CHINESE_CONTENT = `\
写代码这件事，最难的从来不是代码本身。

## 工具的选择

每个项目开始的时候都会面对一个问题：我到底需要什么？不是社区推荐什么，不是上一个团队用了什么，而是这个具体的问题需要什么。答案几乎永远比你想的要少。

我花了好几年收集工具，才学会质疑它们。打包器、Linter、格式化工具、测试框架、CI 流水线——每一个单独看都有道理，但放在一起就成了迷宫。一半的时间都花在配置那些本应该帮我省时间的东西上。

这种感觉很微妙。你并不觉得自己在浪费时间，因为每一步都看起来是在"做正事"。调一下 webpack 配置，修一个 ESLint 规则冲突，升级一个有 breaking change 的依赖——这些都是工作，但都不是真正的工作。

## 转折点

转折发生在一次重写。我把一个项目剥到只剩核心：一个编译器，一个类型检查器，一个部署脚本。三个工具。构建时间从四十秒降到两秒。调试意味着读真正的代码，而不是在插件层里追踪调用栈。

这个教训不是说工具不好，而是每个工具都有成本，而且成本会叠加。一个和 Linter 打架的格式化工具。一个在 Runtime 更新后就挂掉的打包插件。一个需要自己专属配置语言的测试框架。这些不是边界情况——这才是常态。

> 好的工具消失在背景里。坏的工具要求你的注意力。

这句话听起来很简单，但做到很难。因为大多数工具在刚引入的时候都像是好的——它们解决了一个真实的问题。问题是随着时间推移，它们互相干扰，配置膨胀，升级变成了一场赌博。

## 慎重选择

现在我选工具就像选依赖一样：不情不愿地。每一个新增都必须能抵过"写十行代码"这个替代方案。大多数时候，那十行代码赢了。

这并不意味着拒绝进步。[Bun](https://bun.sh) 替代了我三个工具。[oxlint](https://oxc.rs) 的运行速度是 ESLint 的几十倍。[Vite](https://vite.dev) 让开发服务器变成了你不需要思考的东西。

但关键区别在于：这些工具不是在现有工具链上叠加的，而是替换掉了整个层。减法，不是加法。

## 写作

有时候我会想，为什么程序员普遍不爱写文章。大概是因为写代码和写文字是两种完全不同的思维模式。写代码是精确的——编译器不接受含糊。写文字是模糊的——你要在精确和可读之间找到一个平衡点。

但我越来越觉得，能把一件事说清楚，比能把它做出来更难。做出来只需要逻辑正确，说清楚需要理解听众、选择层次、控制节奏。这就是为什么最好的技术文档往往比代码本身更有价值——它们是思考的结晶，而不只是实现的记录。

所以我逼自己写。不是为了读者，是为了自己。每次写完一篇文章，我对那个主题的理解都会更深一层。写作是最好的学习工具，比任何 Tutorial 都管用。

## 留下什么

我经历过的最好的开发体验，不是功能最多的那个，而是我能把整个流水线装在脑子里的那个。一个地方的改动不会波及三个配置文件。反馈循环快到我永远不会丢失思路。

这就是工具应该做的：隐形的基础设施。不是爱好，不是人设，不是谈资。只是那个让开路的东西，让你去做真正重要的事情。

说到底，我们不是为了用工具而写代码。我们是为了造东西而写代码。工具只是手段，不是目的。当手段变成了目的，那就是该停下来想想的时候了。
`

const COMPONENTS_CONTENT = `\
A showcase of custom directive components available in the content pipeline.

## Link card

A rich preview card for external links. The cover image is stored in R2, and the favicon is resolved automatically from the target domain via the proxy API.

::linkcard{src="https://picsum.photos/seed/github/640/360" url="https://github.com" title="GitHub"}

::linkcard{src="https://picsum.photos/seed/bun/640/360" url="https://bun.sh" title="Bun — A fast all-in-one JavaScript runtime"}

::linkcard{src="https://picsum.photos/seed/vite/640/360" url="https://vite.dev" title="Vite — Next Generation Frontend Tooling"}
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

  // Chinese typography test post
  await upsertPost(ctx.db, {
    cid: CHINESE_CID,
    slug: 'chinese-typography',
    title: '写代码这件事',
    description: '关于工具选择、写作与工程取舍的一些想法',
    category: 'engineering',
    tags: ['tooling', 'writing'],
    content: CHINESE_CONTENT,
    contentHash: 'seed-hash-3',
    createdAt: now,
    updatedAt: now,
    published: true,
  })

  // Component showcase post
  await upsertPost(ctx.db, {
    cid: COMPONENTS_CID,
    slug: 'component-showcase',
    title: 'Component showcase',
    description: 'Custom directive components demo',
    category: 'engineering',
    tags: ['components'],
    content: COMPONENTS_CONTENT,
    contentHash: 'seed-hash-4',
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
      cid: CHINESE_CID,
      slug: 'chinese-typography',
      title: '写代码这件事',
      description: '关于工具选择、写作与工程取舍的一些想法',
      category: 'engineering',
      tags: ['tooling', 'writing'],
      content: CHINESE_CONTENT,
      published: true,
    },
    {
      cid: COMPONENTS_CID,
      slug: 'component-showcase',
      title: 'Component showcase',
      description: 'Custom directive components demo',
      category: 'engineering',
      tags: ['components'],
      content: COMPONENTS_CONTENT,
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

  console.log(`  4 posts (3 published, 1 draft)`)
  return { published: PUBLISHED_CID, draft: DRAFT_CID }
}
