// oxlint-disable-next-line import/no-unassigned-import -- side-effect guard: throws at compile time if bundled for client
import '@tanstack/react-start/server-only'

import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const processor = unified()
	.use(remarkParse)
	.use(remarkRehype)
	.use(rehypeShiki, {
		themes: {
			dark: 'github-dark',
			light: 'github-light',
		},
	})
	.use(rehypeStringify)

/** Render a markdown string to syntax-highlighted HTML. */
export async function renderMarkdown(raw: string): Promise<string> {
	const result = await processor.process(raw)
	return String(result)
}
