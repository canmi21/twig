import { error } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/database';
import { isAdmin } from '$lib/server/auth-roles';
import { buildObjectMeta } from '$lib/server/media/meta';
import { bodyEtag } from '$lib/server/media/etag';
import { getMediaItem, isItemPublic } from '$lib/server/media/service';
import type { RequestHandler } from './$types';

// Metadata endpoint. Returns 404 when a private item is requested by a
// non-admin (enumeration defense — same response as "doesn't exist").
// Public responses are cached aggressively at the edge (s-maxage=7d) and
// purged on mutation; browsers revalidate every 60s via the body-hash
// ETag so If-None-Match returns 304 without invoking this handler.

const PUBLIC_CACHE = 'public, max-age=60, s-maxage=604800, stale-while-revalidate=86400';
const PRIVATE_CACHE = 'private, no-store';

export const GET: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!platform?.env.DATABASE) error(503, 'platform bindings unavailable');

	const db = getDatabase(platform.env);
	const item = await getMediaItem(db, params.mid);
	if (!item) error(404, 'not found');

	const publiclyVisible = await isItemPublic(db, item.id);
	const admin = isAdmin(locals.user?.id);
	if (!publiclyVisible && !admin) error(404, 'not found');

	const payload = await buildObjectMeta(db, item);
	const body = JSON.stringify(payload);
	const etag = await bodyEtag(body);

	const ifNoneMatch = request.headers.get('if-none-match');
	if (ifNoneMatch && ifNoneMatch === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				etag,
				'cache-control': publiclyVisible ? PUBLIC_CACHE : PRIVATE_CACHE,
				vary: 'Authorization'
			}
		});
	}

	return new Response(body, {
		status: 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			etag,
			'cache-control': publiclyVisible ? PUBLIC_CACHE : PRIVATE_CACHE,
			vary: 'Authorization'
		}
	});
};
