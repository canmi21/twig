import type { Handle } from '@sveltejs/kit';
import { CODE_FONT_COOKIE, isCodeFont, renderCodeLinks, type CodeFont } from '$lib/font/code-data';
import { isSettingsPath } from '../shared';

// Code font handle mirrors fontHandle. Default `maple` ships @font-face CSS
// with unicode-range subsets; woff2 downloads defer until a <pre> or <code>
// renders a glyph at the requested weight. `monospace` is the CSS generic —
// zero network cost for users who opt out.
export const codeFontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(CODE_FONT_COOKIE);
	const codeFont: CodeFont = isCodeFont(cookie) ? cookie : 'maple';
	event.locals.codeFont = codeFont;

	const links = renderCodeLinks(codeFont, isSettingsPath(event.url.pathname), event.locals.cdn);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%code_font%', codeFont).replace('%code_font_links%', links)
	});
};
