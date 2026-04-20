import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getAuth } from '$lib/server/auth';

export const authHandle: Handle = async ({ event, resolve }) => {
	// vite dev has no platform.env (CF binding only exists under wrangler).
	// Short-circuit cleanly so non-auth pages keep rendering during local UI work.
	if (!event.platform?.env.DATABASE) {
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
