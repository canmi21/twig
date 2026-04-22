import { error, json } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/database';
import { isAdmin } from '$lib/server/auth-roles';
import { findItemBySourceSha } from '$lib/server/media/service';
import type { RequestHandler } from './$types';

// Pre-upload dedup probe. Client computes sha256 of the original file
// bytes before any local processing and hits this endpoint — a match
// lets the upload UI skip the entire re-encode + POST round-trip. Admin
// only: the source sha is a fingerprint that could leak "have you ever
// uploaded file X" to third parties if exposed.

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!platform?.env.DATABASE) error(503, 'platform bindings unavailable');
	if (!isAdmin(locals.user?.id)) error(403, 'admin only');
	if (!/^[0-9a-f]{64}$/.test(params.sha)) error(400, 'invalid sha');

	const db = getDatabase(platform.env);
	const mid = await findItemBySourceSha(db, params.sha);
	if (!mid) error(404, 'not found');
	return json({ mid });
};
