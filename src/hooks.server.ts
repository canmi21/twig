import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { isLocale, type Locale } from '$lib/paraglide/runtime';
import { htmlLangFor } from '$lib/i18n/urls';
import { hasLangCookie, resolveLocaleFromAcceptLanguage, upsertCookie } from '$lib/i18n/negotiate';
import { motionScript } from '$lib/motion/script';
import {
	MODE_COOKIE,
	PALETTE_COOKIE,
	themeScript,
	type Mode,
	type Palette
} from '$lib/theme/script';

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

// Priority: ?lang= param → language cookie → Accept-Language header → en.
// Mutates the Cookie header so Paraglide's cookie strategy sees our decision.
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

const i18nHandle: Handle = ({ event, resolve }) => {
	if (ENDPOINT_ROUTES.has(event.route.id ?? '')) return resolve(event);
	return paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', htmlLangFor(locale))
		});
	});
};

const themeHandle: Handle = async ({ event, resolve }) => {
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

export const handle = sequence(langHandle, i18nHandle, themeHandle);
