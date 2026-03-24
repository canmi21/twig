/* src/lib/compiler/index.ts */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { parse as parseYaml } from 'yaml'
import type { Root as MdastRoot } from 'mdast'
import type { Plugin } from 'unified'
import { rehypeToc } from './rehype-toc'
import type { TocEntry } from './rehype-toc'

export type { TocEntry }

export interface Frontmatter {
  title: string
  description?: string
  category?: string
  tags?: string[]
}

export interface CompileResult {
  frontmatter: Frontmatter
  html: string
  toc: TocEntry[]
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

export async function compile(source: string): Promise<CompileResult> {
  const fmStore: { raw?: string } = {}
  const toc: TocEntry[] = []

  const html = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkExtractFrontmatter, { store: fmStore })
    .use(remarkRehype)
    .use(rehypeToc, { toc })
    .use(rehypeStringify)
    .process(source)

  const frontmatter: Frontmatter = fmStore.raw
    ? parseYaml(fmStore.raw)
    : { title: '' }

  return {
    frontmatter,
    html: String(html),
    toc,
  }
}
