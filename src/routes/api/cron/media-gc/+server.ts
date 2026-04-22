import { error, json } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth-roles';
import { getDatabase } from '$lib/server/database';
import { drainGcQueue } from '$lib/server/media/service';
import type { RequestHandler } from './$types';

// Manual drain for the media GC queue. Designed to be callable two ways:
//   1. Admin session (click / curl from /@/) — for debugging and ad-hoc cleanup.
//   2. External scheduler with `Authorization: Bearer $CRON_SECRET` — the
//      Cloudflare cron-triggers binding needs scheduled-handler plumbing
//      through the SvelteKit adapter that isn't wired yet; an HTTP-cron
//      ping is a simpler interim solution.
//
// Until the scheduled handler is in place, hit this periodically (daily
// is fine for a single-author site). The drain is idempotent, so
// duplicate invocations are harmless.

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform?.env.DATABASE) error(503, 'platform bindings unavailable');

	const secret = (platform.env as unknown as { CRON_SECRET?: string }).CRON_SECRET;
	const authHeader = request.headers.get('authorization');
	const hasSecretMatch = secret && authHeader === `Bearer ${secret}`;
	if (!hasSecretMatch && !isAdmin(locals.user?.id)) error(403, 'forbidden');

	const url = new URL(request.url);
	const limitRaw = url.searchParams.get('limit');
	const limit = limitRaw ? Math.max(1, Math.min(500, Number(limitRaw))) : 50;

	const db = getDatabase(platform.env);
	const result = await drainGcQueue(platform.env, db, limit);
	return json(result);
};
