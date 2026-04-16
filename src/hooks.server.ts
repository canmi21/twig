import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { isLocale, type Locale } from '$lib/paraglide/runtime';
import { htmlLangFor } from '$lib/i18n/urls';
import { hasLangCookie, resolveLocaleFromAcceptLanguage, upsertCookie } from '$lib/i18n/negotiate';
import { THEME_COOKIE, themeScript, type Theme } from '$lib/theme/script';

const LANG_COOKIE = 'language';
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const ENDPOINT_ROUTES = new Set<string>(__SERVER_ROUTES__);

function forceLocale(event: Parameters<Handle>[0]['event'], locale: Locale) {
	const existing = event.request.headers.get('cookie') ?? '';
	const headers = new Headers(event.request.headers);
	headers.set('cookie', upsertCookie(existing, LANG_COOKIE, locale));
	event.request = new Request(event.request, { headers });
	event.cookies.set(LANG_COOKIE, locale, {
		path: '/',
		maxAge: LANG_COOKIE_MAX_AGE,
		sameSite: 'lax',
		httpOnly: false
	});
}

// Locale negotiation, in priority order:
//   1. `?lang=<locale>` query parameter (wins over everything, persists).
//   2. Existing `language` cookie from a previous visit.
//   3. `Accept-Language` header mapped via `resolveLocaleFromAcceptLanguage`.
//   4. Fallback: `en`.
// The hook mutates the request's Cookie header so Paraglide's cookie strategy
// picks up our decision, and writes a Set-Cookie header so subsequent visits
// keep the choice.
const langHandle: Handle = ({ event, resolve }) => {
	if (ENDPOINT_ROUTES.has(event.route.id ?? '')) return resolve(event);
	if (event.request.method !== 'GET') return resolve(event);

	const langParam = event.url.searchParams.get('lang');
	if (langParam && isLocale(langParam)) {
		const clean = new URL(event.url);
		clean.searchParams.delete('lang');
		const cookie = event.cookies.serialize(LANG_COOKIE, langParam, {
			path: '/',
			maxAge: LANG_COOKIE_MAX_AGE,
			sameSite: 'lax',
			httpOnly: false
		});
		return new Response(null, {
			status: 302,
			headers: {
				Location: clean.pathname + clean.search,
				'Set-Cookie': cookie
			}
		});
	}

	if (!hasLangCookie(event.request.headers.get('cookie'))) {
		const chosen = resolveLocaleFromAcceptLanguage(event.request.headers.get('accept-language'));
		forceLocale(event, chosen);
	}

	return resolve(event);
};

const paraglideHandle: Handle = ({ event, resolve }) => {
	if (ENDPOINT_ROUTES.has(event.route.id ?? '')) return resolve(event);
	return paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', htmlLangFor(locale))
		});
	});
};

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
