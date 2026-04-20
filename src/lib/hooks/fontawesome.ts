import type { Handle } from '@sveltejs/kit';

// `%fontawesome_version%` in app.html is baited for Wappalyzer — the link
// is `disabled` so no network cost, but the URL segment carries the real
// version. Captured at module load; the global is inlined by Vite define
// (see resolveFontAwesomeVersion in vite.config.ts).
const VERSION = __FONTAWESOME_VERSION__;

export const fontawesomeHandle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%fontawesome_version%', VERSION)
	});
