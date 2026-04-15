import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { isLocale } from '$lib/paraglide/runtime';
import { htmlLangFor } from '$lib/i18n/urls';
import { THEME_COOKIE, themeScript, type Theme } from '$lib/theme/script';

const LANG_COOKIE = 'language';
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function upsertCookie(cookieHeader: string, name: string, value: string): string {
	const pattern = new RegExp(`(^|; *)${name}=[^;]*`);
	if (pattern.test(cookieHeader)) {
		return cookieHeader.replace(pattern, `$1${name}=${value}`);
	}
	return cookieHeader ? `${cookieHeader}; ${name}=${value}` : `${name}=${value}`;
}

// When the request URL carries `?lang=<locale>`, that query parameter wins
// over the existing cookie for this render *and* persists to the browser so
// subsequent visits without the parameter keep the chosen locale.
const langHandle: Handle = ({ event, resolve }) => {
	const langParam = event.url.searchParams.get('lang');
	if (event.request.method === 'GET' && langParam && isLocale(langParam)) {
		const existing = event.request.headers.get('cookie') ?? '';
		const headers = new Headers(event.request.headers);
		headers.set('cookie', upsertCookie(existing, LANG_COOKIE, langParam));
		event.request = new Request(event.request, { headers });

		event.cookies.set(LANG_COOKIE, langParam, {
			path: '/',
			maxAge: LANG_COOKIE_MAX_AGE,
			sameSite: 'lax'
		});
	}
	return resolve(event);
};

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', htmlLangFor(locale))
		});
	});

const themeHandle: Handle = async ({ event, resolve }) => {
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

export const handle = sequence(langHandle, paraglideHandle, themeHandle);
