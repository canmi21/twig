import { error, type RequestHandler } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';

// Registers /api/auth/* with SvelteKit's router so locale negotiation skips it;
// svelteKitHandler in hooks.server.ts intercepts the request before this runs.
const dispatch: RequestHandler = ({ request, platform }) => {
	if (!platform?.env.DATABASE) {
		error(503, 'auth requires the cloudflare runtime; use `just preview`');
	}
	return getAuth(platform.env).handler(request);
};

export const GET = dispatch;
export const POST = dispatch;
