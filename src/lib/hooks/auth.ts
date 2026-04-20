import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getAuth } from '$lib/server/auth';

export const authHandle: Handle = async ({ event, resolve }) => {
	// Two cases need a clean short-circuit before touching platform.env:
	//   1. `building` — prerender (robots.txt, sitemap.xml). adapter-cloudflare's
	//      platform proxy throws on ANY env access during prerender, so we can't
	//      even probe for DATABASE. Prerendered routes never need auth anyway.
	//   2. vite dev — no CF runtime, platform is undefined.
	if (building || !event.platform?.env.DATABASE) {
		return resolve(event);
	}

	const auth = getAuth(event.platform.env);

	const result = await auth.api.getSession({ headers: event.request.headers });
	if (result) {
		event.locals.user = result.user;
		event.locals.session = result.session;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
