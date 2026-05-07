import type { Handle } from '@sveltejs/kit';
import { isLocale } from '$lib/paraglide/runtime';
import { hasLangCookie, resolveLocaleFromAcceptLanguage } from '$lib/i18n/negotiate';
import { ENDPOINT_ROUTES, LANG_COOKIE, LANG_COOKIE_MAX_AGE, forceLocale } from './shared';

// Priority: ?lang= param → language cookie → Accept-Language header → en.
// Mutates the Cookie header so Paraglide's cookie strategy sees our decision.
export const langHandle: Handle = ({ event, resolve }) => {
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
