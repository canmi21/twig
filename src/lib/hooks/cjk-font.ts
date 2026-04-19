import type { Handle } from '@sveltejs/kit';
import { baseLocale } from '$lib/paraglide/runtime';
import { htmlLangFor } from '$lib/i18n/urls';
import { CJK_FONT_COOKIE, isCjkFont, renderCjkLinks, type CjkFont } from '$lib/font/cjk-data';
import { LANG_COOKIE, isSettingsPath } from './shared';

// CJK font choice drives a `<html lang>`-aware stack: the primary CJK face for
// the current language plus one coexisting fallback (SC+JP or TC+JP or JP+SC).
// /settings loads every CJK option's primary + fallback face pair so preview
// cards can render their own glyphs; elsewhere only the selected choice ships.
export const cjkFontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(CJK_FONT_COOKIE);
	const cjkFont: CjkFont = isCjkFont(cookie) ? cookie : 'system';
	event.locals.cjkFont = cjkFont;

	const langCookie = event.cookies.get(LANG_COOKIE) ?? baseLocale;
	const htmlLang = htmlLangFor(langCookie);
	event.locals.htmlLang = htmlLang;

	const links = renderCjkLinks(
		cjkFont,
		htmlLang,
		isSettingsPath(event.url.pathname),
		event.locals.cdn
	);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%cjk_font%', cjkFont).replace('%cjk_font_links%', links)
	});
};
