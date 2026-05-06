import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { htmlLangFor } from '$lib/i18n/urls';
import { ENDPOINT_ROUTES } from './shared';

export const i18nHandle: Handle = ({ event, resolve }) => {
	if (ENDPOINT_ROUTES.has(event.route.id ?? '')) return resolve(event);
	return paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', htmlLangFor(locale))
		});
	});
};
