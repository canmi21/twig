import type { Handle } from '@sveltejs/kit';
import { DEFAULT_HOSTS, resolveCdnHosts } from '$lib/cdn/hosts';

// Resolve the mirror set from request.cf.country so SSR emits working origins
// for blocked regions without client-side probing; dev/prerender get defaults.
export const cdnHandle: Handle = async ({ event, resolve }) => {
	const country = event.platform?.cf?.country;
	event.locals.cdn = country ? resolveCdnHosts(country) : DEFAULT_HOSTS;
	return resolve(event);
};
