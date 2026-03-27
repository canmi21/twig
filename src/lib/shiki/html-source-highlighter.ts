/* src/lib/shiki/html-source-highlighter.ts */

import { createBundledHighlighter } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { HighlighterGeneric, ThemedToken, TokensResult } from 'shiki/core'

type HtmlSourceLanguage = 'html'
type HtmlSourceTheme = 'github-light' | 'github-dark'

const createHtmlSourceHighlighter = createBundledHighlighter<
  HtmlSourceLanguage,
  HtmlSourceTheme
>({
  langs: {
    html: () => import('@shikijs/langs/html'),
  },
  themes: {
    'github-light': () => import('@shikijs/themes/github-light'),
    'github-dark': () => import('@shikijs/themes/github-dark'),
  },
  engine: () => createJavaScriptRegexEngine(),
})

let highlighterPromise: Promise<
  HighlighterGeneric<HtmlSourceLanguage, HtmlSourceTheme>
> | null = null

function getHtmlSourceHighlighter() {
  highlighterPromise ??= createHtmlSourceHighlighter({
    langs: ['html'],
    themes: ['github-light', 'github-dark'],
  })

  return highlighterPromise
}

export interface HtmlSourceHighlightResult {
  bg?: string
  fg?: string
  tokens: ThemedToken[][]
}

export async function highlightHtmlSource(
  code: string,
  theme: HtmlSourceTheme,
): Promise<HtmlSourceHighlightResult> {
  const highlighter = await getHtmlSourceHighlighter()
  const result: TokensResult = highlighter.codeToTokens(code, {
    lang: 'html',
    theme,
  })

  return {
    bg: result.bg,
    fg: result.fg,
    tokens: result.tokens,
  }
}
