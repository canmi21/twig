import type { Handle } from '@sveltejs/kit';
import { THEME_COOKIE, themeScript, type Theme } from '$lib/theme/script';

export const handle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(THEME_COOKIE);
	// SSR defaults to light when the cookie is missing; the inline script corrects
	// the client synchronously before paint, so there is no flash.
	const theme: Theme = cookie === 'dark' ? 'dark' : 'light';
	event.locals.theme = theme;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%theme%', theme === 'dark' ? 'dark' : '')
				.replace('%theme_script%', `<script>${themeScript}</script>`)
	});
};
