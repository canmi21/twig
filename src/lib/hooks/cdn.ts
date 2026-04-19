import type { Handle } from '@sveltejs/kit';
import { DEFAULT_HOSTS, resolveCdnHosts } from '$lib/cdn/hosts';

// CN / IR / RU can't reach Google Fonts reliably, and CN also can't reach
// cdn.jsdelivr.net since its ICP revocation. Pick the mirror set once from
// request.cf.country so SSR emits working origins for blocked regions
// without any client-side probing. Dev / prerender have no cf → defaults.
export const cdnHandle: Handle = async ({ event, resolve }) => {
	const country = event.platform?.cf?.country;
	event.locals.cdn = country ? resolveCdnHosts(country) : DEFAULT_HOSTS;
	return resolve(event);
};
