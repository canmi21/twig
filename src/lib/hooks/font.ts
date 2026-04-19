import type { Handle } from '@sveltejs/kit';
import {
	FONT_COOKIE,
	LOADABLE_FONT_IDS,
	isFontFamily,
	renderFontLinks,
	type FontFamily
} from '$lib/font/data';
import { isSettingsPath } from './shared';

// Scope Google Fonts network cost to the route that actually needs it:
// /settings preloads every loadable font so the preview cards render their own
// faces; elsewhere only the selected font ships. `system` means zero network.
export const fontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(FONT_COOKIE);
	const font: FontFamily = isFontFamily(cookie) ? cookie : 'system';
	event.locals.font = font;

	const ids: FontFamily[] = isSettingsPath(event.url.pathname)
		? LOADABLE_FONT_IDS
		: font === 'system'
			? []
			: [font];
	const links = renderFontLinks(ids, event.locals.cdn);

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%font%', font).replace('%font_links%', links)
	});
};
