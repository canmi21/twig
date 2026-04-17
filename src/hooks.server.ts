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
import {
	FONT_COOKIE,
	LOADABLE_FONT_IDS,
	isFontFamily,
	renderFontLinks,
	type FontFamily
} from '$lib/font/script';
import { CJK_FONT_COOKIE, isCjkFont, renderCjkLinks, type CjkFont } from '$lib/font/cjk-script';
import { baseLocale } from '$lib/paraglide/runtime';

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

// Scope Google Fonts network cost to the route that actually needs it:
// /settings preloads every loadable font so the preview cards render their own
// faces; elsewhere only the selected font ships. `system` means zero network.
const fontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(FONT_COOKIE);
	const font: FontFamily = isFontFamily(cookie) ? cookie : 'system';
	event.locals.font = font;

	const isSettings =
		event.url.pathname === '/settings' || event.url.pathname.startsWith('/settings/');
	const ids: FontFamily[] = isSettings ? LOADABLE_FONT_IDS : font === 'system' ? [] : [font];
	const links = renderFontLinks(ids);

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%font%', font).replace('%font_links%', links)
	});
};

// CJK font choice drives a `<html lang>`-aware stack: the primary CJK face for
// the current language plus one coexisting fallback (SC+JP or TC+JP or JP+SC).
// /settings loads every CJK option's primary + fallback face pair so preview
// cards can render their own glyphs; elsewhere only the selected choice ships.
const cjkFontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(CJK_FONT_COOKIE);
	const cjkFont: CjkFont = isCjkFont(cookie) ? cookie : 'system';
	event.locals.cjkFont = cjkFont;

	const langCookie = event.cookies.get(LANG_COOKIE) ?? baseLocale;
	const htmlLang = htmlLangFor(langCookie);
	event.locals.htmlLang = htmlLang;

	const isSettings =
		event.url.pathname === '/settings' || event.url.pathname.startsWith('/settings/');
	const links = renderCjkLinks(cjkFont, htmlLang, isSettings);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%cjk_font%', cjkFont).replace('%cjk_font_links%', links)
	});
};

export const handle = sequence(langHandle, i18nHandle, themeHandle, fontHandle, cjkFontHandle);
