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
import type { Root as MdastRoot, Nodes as MdastNode } from 'mdast'
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
  tweet?: string
  cid?: string
  created_at?: string
  updated_at?: string
  published?: boolean
}

export interface CompileResult {
  frontmatter: Frontmatter
  html: string
  /** Plain-text projection of the body, derived from the mdast tree.
   *  Used for previews and excerpts where HTML parsing would be fragile. */
  text: string
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

// Node types that contribute no readable prose: raw code blocks, escape
// hatches (html), frontmatter, structural directive widgets, horizontal
// rules, and footnote scaffolding.
const TEXT_SKIP_TYPES = new Set<string>([
  'yaml',
  'code',
  'html',
  'containerDirective',
  'leafDirective',
  'textDirective',
  'thematicBreak',
  'definition',
  'footnoteDefinition',
  'footnoteReference',
])

// Block-level containers whose completion should emit a word boundary so
// adjacent block text (e.g. paragraphs, list items) does not run together.
const TEXT_BLOCK_TYPES = new Set<string>([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'tableRow',
])

const remarkExtractText: Plugin<[{ store: { text: string } }], MdastRoot> =
  (options) => (tree) => {
    const parts: string[] = []

    const walk = (node: MdastNode) => {
      if (TEXT_SKIP_TYPES.has(node.type)) return

      if (node.type === 'text' || node.type === 'inlineCode') {
        parts.push(node.value)
        return
      }

      if ('children' in node) {
        for (const child of node.children) {
          walk(child as MdastNode)
        }
        if (TEXT_BLOCK_TYPES.has(node.type)) {
          parts.push(' ')
        }
      }
    }

    walk(tree)
    options.store.text = parts.join('').replaceAll(/\s+/g, ' ').trim()
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
  const textStore: { text: string } = { text: '' }
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
    .use(remarkExtractText, { store: textStore })
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
    text: textStore.text,
    toc,
    components,
  }
}
