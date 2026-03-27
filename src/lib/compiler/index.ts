/* src/lib/compiler/index.ts */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import rehypeStringify from 'rehype-stringify'
import { parse as parseYaml } from 'yaml'
import type { Root as MdastRoot } from 'mdast'
import type { Plugin } from 'unified'
import { createBundledHighlighter } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { bundledLanguages } from 'shiki/langs'
import { bundledThemes } from 'shiki/themes'
import { rehypeToc } from './rehype-toc'
import type { TocEntry } from './rehype-toc'
import { remarkExtractDirectives } from './remark-directives'
import type { ComponentEntry } from './remark-directives'

export type { TocEntry, ComponentEntry }

export interface Frontmatter {
  title: string
  description?: string
  category?: string
  tags?: string[]
  cid?: string
  created_at?: string
  updated_at?: string
  published?: boolean
}

export interface CompileResult {
  frontmatter: Frontmatter
  html: string
  toc: TocEntry[]
  components: ComponentEntry[]
}

const remarkExtractFrontmatter: Plugin<
  [{ store: { raw?: string } }],
  MdastRoot
> = (options) => (tree) => {
  for (const node of tree.children) {
    if (node.type === 'yaml') {
      options.store.raw = node.value
      return
    }
  }
}

const createContentHighlighter = createBundledHighlighter({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createJavaScriptRegexEngine(),
})

let contentHighlighterPromise: ReturnType<
  typeof createContentHighlighter
> | null = null

async function getContentHighlighter() {
  contentHighlighterPromise ??= createContentHighlighter({
    langs: [],
    themes: ['github-light', 'github-dark'],
  })

  return contentHighlighterPromise
}

export async function compile(source: string): Promise<CompileResult> {
  const fmStore: { raw?: string } = {}
  const toc: TocEntry[] = []
  const components: ComponentEntry[] = []
  const highlighter = await getContentHighlighter()

  const html = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkExtractFrontmatter, { store: fmStore })
    .use(remarkDirective)
    .use(remarkExtractDirectives, { components })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeToc, { toc })
    .use(() =>
      rehypeShikiFromHighlighter(highlighter, {
        themes: { light: 'github-light', dark: 'github-dark' },
        lazy: true,
      }),
    )
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(source)

  const frontmatter: Frontmatter = fmStore.raw
    ? parseYaml(fmStore.raw)
    : { title: '' }

  return {
    frontmatter,
    html: String(html),
    toc,
    components,
  }
}
