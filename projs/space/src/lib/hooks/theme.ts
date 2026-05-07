import type { Handle } from '@sveltejs/kit';
import { motionScript } from '$lib/motion/script';
import { MODE_COOKIE, PALETTE_COOKIE, themeScript, type Mode, type Palette } from '$lib/theme/data';

export const themeHandle: Handle = async ({ event, resolve }) => {
	const modeCookie = event.cookies.get(MODE_COOKIE);
	const paletteCookie = event.cookies.get(PALETTE_COOKIE);
	// SSR defaults to light + neutral; the inline script corrects before paint (no flash).
	const mode: Mode = modeCookie === 'dark' ? 'dark' : 'light';
	const palette: Palette =
		paletteCookie === 'nord' || paletteCookie === 'contrast' ? paletteCookie : 'neutral';
	event.locals.theme = { mode, palette };

	const cls = [mode === 'dark' ? 'dark' : '', palette !== 'neutral' ? palette : '']
		.filter(Boolean)
		.join(' ');

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%theme%', cls)
				.replace('%theme_script%', `<script>${themeScript}</script>`)
				.replace('%motion_script%', `<script>${motionScript}</script>`)
	});
};
