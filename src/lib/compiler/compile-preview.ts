/* src/lib/compiler/compile-preview.ts */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { rehypeToc } from './rehype-toc'
import type { TocEntry } from './rehype-toc'
import { remarkExtractDirectives } from './remark-directives'
import type { ComponentEntry } from './remark-directives'

export interface PreviewResult {
  html: string
  toc: TocEntry[]
  components: ComponentEntry[]
}

/**
 * Browser-safe markdown compiler without shiki.
 * Code blocks render as plain <pre><code> without syntax highlighting.
 */
export async function compilePreview(source: string): Promise<PreviewResult> {
  const toc: TocEntry[] = []
  const components: ComponentEntry[] = []

  const html = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkDirective)
    .use(remarkExtractDirectives, { components })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeToc, { toc })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(source)

  return { html: String(html), toc, components }
}
