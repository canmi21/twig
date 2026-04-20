import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getAuth } from '$lib/server/auth';

export const authHandle: Handle = async ({ event, resolve }) => {
	// `building` must short-circuit before any env access — adapter-cloudflare's
	// platformProxy throws on prerender (robots.txt, sitemap.xml), and those
	// routes never need auth. The DATABASE check is the safety net: in vite dev
	// and `just preview` the binding is always there via platformProxy, so
	// missing it means the platform proxy itself is broken — clean pass-through
	// is better than a stack trace from getAuth(undefined.env).
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
