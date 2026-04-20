import { error, type RequestHandler } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';

// All Better Auth endpoints (sign-in, send-otp, get-session, ...) flow
// through this catch-all. svelteKitHandler in hooks.server.ts already
// intercepts these paths in production — this file makes them resolvable
// to SvelteKit's router so /api/auth/* shows up in __SERVER_ROUTES__ and
// is excluded from locale negotiation.
const dispatch: RequestHandler = ({ request, platform }) => {
	if (!platform?.env.DATABASE) {
		error(503, 'auth requires the cloudflare runtime; use `just preview`');
	}
	return getAuth(platform.env).handler(request);
};

export const GET = dispatch;
export const POST = dispatch;
