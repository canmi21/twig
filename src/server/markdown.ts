// oxlint-disable-next-line import/no-unassigned-import -- side-effect guard: throws at compile time if bundled for client
import '@tanstack/react-start/server-only'

import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import type { HighlighterGeneric } from '@shikijs/types'
import { createHighlighterCore } from 'shiki/core'
import { unified } from 'unified'

const highlighter = await createHighlighterCore({
	engine: createJavaScriptRegexEngine(),
	langs: [
		import('shiki/langs/typescript.mjs'),
		import('shiki/langs/javascript.mjs'),
		import('shiki/langs/css.mjs'),
		import('shiki/langs/html.mjs'),
		import('shiki/langs/sql.mjs'),
		import('shiki/langs/json.mjs'),
		import('shiki/langs/yaml.mjs'),
		import('shiki/langs/bash.mjs'),
	],
	themes: [import('shiki/themes/github-dark.mjs'), import('shiki/themes/github-light.mjs')],
})

const processor = unified()
	.use(remarkParse)
	.use(remarkRehype)
	// See shikijs/shiki#985: HighlighterCore is Generic<never,never> but rehype expects <any,any>.
	.use(rehypeShikiFromHighlighter, highlighter as HighlighterGeneric<string, string>, {
		themes: {
			dark: 'github-dark',
			light: 'github-light',
		},
	})
	.use(rehypeStringify)

/** Render a markdown string to syntax-highlighted HTML. */
export async function renderMarkdown(raw: string): Promise<string> {
	const result = await processor.process(raw)
	return String(result).replaceAll(/\n\s*\n/g, '\n')
}
