import * as serverOnly from '@tanstack/react-start/server-only'

import { marked, type Token, type Tokens, type TokensList } from 'marked'
import { createHighlighterCore, isPlainLang } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { takiCodeTheme } from './shiki-theme'

void serverOnly

const shikiLanguages = {
	ts: () => import('@shikijs/langs/typescript'),
	tsx: () => import('@shikijs/langs/tsx'),
	js: () => import('@shikijs/langs/typescript'),
	jsx: () => import('@shikijs/langs/jsx'),
	json: () => import('@shikijs/langs/json'),
	jsonc: () => import('@shikijs/langs/jsonc'),
	html: () => import('@shikijs/langs/html'),
	css: () => import('@shikijs/langs/css'),
	bash: () => import('@shikijs/langs/bash'),
	md: () => import('@shikijs/langs/markdown'),
	markdown: () => import('@shikijs/langs/markdown'),
	sql: () => import('@shikijs/langs/sql'),
	yaml: () => import('@shikijs/langs/yaml'),
	toml: () => import('@shikijs/langs/toml'),
} as const

let highlighterInstance: HighlighterInstance | undefined

async function getHighlighter(): Promise<HighlighterInstance> {
	if (highlighterInstance) return highlighterInstance
	highlighterInstance = await createHighlighterCore({
		engine: createJavaScriptRegexEngine(),
		themes: [takiCodeTheme],
		langs: Object.values(shikiLanguages).map((loader) => loader()),
	})
	return highlighterInstance
}

type HighlighterInstance = Awaited<ReturnType<typeof createHighlighterCore>>
type NestedTokens =
	| Tokens.Blockquote
	| Tokens.Del
	| Tokens.Em
	| Tokens.Heading
	| Tokens.Image
	| Tokens.Link
	| Tokens.ListItem
	| Tokens.Paragraph
	| Tokens.Text
	| Tokens.Strong

export async function renderMarkdown(markdown: string): Promise<string> {
	const tokens = marked.lexer(markdown, { gfm: true })
	await replaceCodeTokens(tokens)
	return marked.parser(tokens, { gfm: true })
}

async function renderCodeBlock(code: string, info?: string): Promise<string> {
	const highlighter = await getHighlighter()
	const lang = resolveLanguage(highlighter, info)

	return highlighter.codeToHtml(code, {
		lang,
		theme: 'taki-code',
	})
}

function resolveLanguage(highlighter: HighlighterInstance, info?: string): string {
	const candidate = info?.trim().split(/\s+/, 1)[0]

	if (!candidate || isPlainLang(candidate)) return 'text'

	const loaded = new Set(highlighter.getLoadedLanguages())
	if (loaded.has(candidate)) return candidate

	const resolved = highlighter.resolveLangAlias(candidate) || candidate
	if (!loaded.has(resolved)) return 'text'

	return resolved
}

async function replaceCodeTokens(tokens: TokensList | Token[]): Promise<void> {
	for (const token of tokens) {
		switch (token.type) {
			case 'code': {
				const codeToken = token as Tokens.Code
				const html = await renderCodeBlock(codeToken.text, codeToken.lang)
				Object.assign(token, {
					type: 'html',
					raw: html,
					text: html,
					block: true,
					pre: true,
				})
				break
			}
			case 'blockquote':
			case 'paragraph':
			case 'heading':
			case 'text':
			case 'em':
			case 'strong':
			case 'del':
			case 'link':
			case 'image':
			case 'list_item':
				if ((token as NestedTokens).tokens) {
					await replaceCodeTokens((token as NestedTokens).tokens)
				}
				break
			case 'list': {
				const listToken = token as Tokens.List
				for (const item of listToken.items) {
					await replaceCodeTokens(item.tokens)
				}
				break
			}
			case 'table': {
				const tableToken = token as Tokens.Table
				for (const cell of tableToken.header) {
					await replaceCodeTokens(cell.tokens)
				}
				for (const row of tableToken.rows) {
					for (const cell of row) {
						await replaceCodeTokens(cell.tokens)
					}
				}
				break
			}
			default:
				break
		}
	}
}
