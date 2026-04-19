import type { Handle } from '@sveltejs/kit';
import { CODE_FONT_COOKIE, isCodeFont, renderCodeLinks, type CodeFont } from '$lib/font/code-data';
import { isSettingsPath } from './shared';

// Code font handle mirrors fontHandle: default `monospace` means CSS generic
// only — zero network cost. Loadable picks ship their @font-face CSS, which
// registers unicode-range subsets; woff2 downloads are deferred until a <pre>
// or <code> element renders a glyph at the requested weight.
export const codeFontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(CODE_FONT_COOKIE);
	const codeFont: CodeFont = isCodeFont(cookie) ? cookie : 'monospace';
	event.locals.codeFont = codeFont;

	const links = renderCodeLinks(codeFont, isSettingsPath(event.url.pathname), event.locals.cdn);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%code_font%', codeFont).replace('%code_font_links%', links)
	});
};
