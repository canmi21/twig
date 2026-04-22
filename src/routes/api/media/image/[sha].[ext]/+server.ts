import { error } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/database';
import { isAdmin } from '$lib/server/auth-roles';
import { blobIsReferenced, getMediaBlob, isBlobPublic } from '$lib/server/media/service';
import { imageR2Key } from '$lib/server/media/r2-key';
import type { RequestHandler } from './$types';

// Content-addressed image delivery. URL shape is stable and immutable —
// the sha256 is the content fingerprint. Public blobs are served with a
// long immutable cache so CF edge carries the traffic; private blobs
// skip CDN entirely and require admin auth.
//
// Enumeration defense: a sha that's never been referenced returns the
// same 404 as one that's private-and-not-owned. Never leak the
// "exists but forbidden" signal.

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!platform?.env.DATABASE) error(503, 'platform bindings unavailable');
	const sha = params.sha;
	if (!/^[0-9a-f]{64}$/.test(sha)) error(404, 'not found');

	const db = getDatabase(platform.env);
	const [blob, referenced, publiclyVisible] = await Promise.all([
		getMediaBlob(db, sha),
		blobIsReferenced(db, sha),
		isBlobPublic(db, sha)
	]);
	if (!blob || !referenced) error(404, 'not found');
	if (!publiclyVisible && !isAdmin(locals.user?.id)) error(404, 'not found');

	const object = await platform.env.STORAGE.get(imageR2Key(sha));
	if (!object) error(404, 'not found');

	return new Response(object.body, {
		headers: {
			'content-type': blob.mime,
			'content-length': blob.bytesSize.toString(),
			'cache-control': publiclyVisible
				? 'public, max-age=31536000, immutable'
				: 'private, no-store',
			vary: 'Authorization'
		}
	});
};
