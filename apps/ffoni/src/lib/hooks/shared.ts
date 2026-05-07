import type { Handle } from '@sveltejs/kit';
import type { Locale } from '$lib/paraglide/runtime';
import { upsertCookie } from '$lib/i18n/negotiate';

export const LANG_COOKIE = 'language';
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const ENDPOINT_ROUTES = new Set<string>(__SERVER_ROUTES__);

type HandleEvent = Parameters<Handle>[0]['event'];

export function forceLocale(event: HandleEvent, locale: Locale) {
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

export function isSettingsPath(pathname: string) {
	return pathname === '/settings' || pathname.startsWith('/settings/');
}
