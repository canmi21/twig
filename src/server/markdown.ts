/* src/server/markdown.ts */

// oxlint-disable-next-line import/no-unassigned-import -- side-effect guard: throws at compile time if bundled for client
import '@tanstack/react-start/server-only'

import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
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
	.use(remarkFrontmatter)
	.use(remarkGfm)
	.use(remarkMath)
	.use(remarkRehype)
	// See shikijs/shiki#985: HighlighterCore is Generic<never,never> but rehype expects <any,any>.
	.use(rehypeShikiFromHighlighter, highlighter as HighlighterGeneric<string, string>, {
		themes: {
			dark: 'github-dark',
			light: 'github-light',
		},
	})
	.use(rehypeKatex)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: 'prepend',
		properties: {
			className: ['heading-anchor'],
			ariaHidden: 'true',
			tabIndex: -1,
		},
		content: {
			type: 'element',
			tagName: 'span',
			properties: { className: ['heading-anchor-icon'] },
			children: [
				{
					type: 'element',
					tagName: 'svg',
					properties: {
						xmlns: 'http://www.w3.org/2000/svg',
						width: '0.75em',
						height: '0.75em',
						viewBox: '0 0 24 24',
						fill: 'none',
						stroke: 'currentColor',
						strokeWidth: '2',
						strokeLinecap: 'round',
						strokeLinejoin: 'round',
					},
					children: [
						{
							type: 'element',
							tagName: 'path',
							properties: {
								d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
							},
							children: [],
						},
						{
							type: 'element',
							tagName: 'path',
							properties: {
								d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
							},
							children: [],
						},
					],
				},
			],
		},
	})
	.use(rehypeStringify)

/** Render a markdown string to syntax-highlighted HTML. */
export async function renderMarkdown(raw: string): Promise<string> {
	const result = await processor.process(raw)
	return String(result).replaceAll(/\n\s*\n/g, '\n')
}
