import type { Handle } from '@sveltejs/kit';

// Wappalyzer bait — the `disabled` link in app.html carries the real version
// in its URL segment but costs no network; version is inlined at build time.
const VERSION = __FONTAWESOME_VERSION__;

export const fontawesomeHandle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%fontawesome_version%', VERSION)
	});
