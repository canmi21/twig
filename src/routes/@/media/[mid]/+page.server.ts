import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth-roles';
import { getDatabase } from '$lib/server/database';
import { buildObjectMeta } from '$lib/server/media/meta';
import { mediaImageUrl, mediaObjectUrl, purgeUrls } from '$lib/server/media/purge';
import {
	deleteMediaItem,
	getMediaItem,
	setLibraryVisibility,
	updateMediaItem
} from '$lib/server/media/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	if (!platform) error(500, 'platform bindings unavailable');
	if (!isAdmin(locals.user?.id)) error(403, 'admin only');

	const db = getDatabase(platform.env);
	const item = await getMediaItem(db, params.mid);
	if (!item) error(404, 'media item not found');

	return { meta: await buildObjectMeta(db, item) };
};

export const actions: Actions = {
	update: async ({ request, params, platform, locals }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		if (!isAdmin(locals.user?.id)) return fail(403, { error: 'admin only' });

		const form = await request.formData();
		const altText = String(form.get('alt_text') ?? '').trim();
		const capturedAtRaw = String(form.get('captured_at') ?? '').trim();
		const capturedAt = capturedAtRaw.length > 0 ? new Date(capturedAtRaw) : null;

		const db = getDatabase(platform.env);
		await updateMediaItem(db, params.mid, {
			altText: altText === '' ? null : altText,
			capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : null
		});
		if (platform.ctx) {
			platform.ctx.waitUntil(purgeUrls(platform.env, [mediaObjectUrl(params.mid)]));
		}
		return { success: true };
	},

	visibility: async ({ request, params, platform, locals }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		if (!isAdmin(locals.user?.id)) return fail(403, { error: 'admin only' });

		const form = await request.formData();
		const desired = form.get('is_public') === 'true';

		const db = getDatabase(platform.env);
		const item = await getMediaItem(db, params.mid);
		if (!item) return fail(404, { error: 'not found' });

		await setLibraryVisibility(db, params.mid, desired);

		// Visibility flip invalidates both the meta endpoint and — if we
		// just flipped from public to private — the image blob URLs too.
		// Purge both variants. When going private → public the image URLs
		// weren't previously cached public, so purge is a no-op there, but
		// issuing it anyway keeps the code path uniform.
		if (platform.ctx) {
			const urls = [mediaObjectUrl(params.mid), mediaImageUrl(item.displaySha256)];
			if (item.hqSha256) urls.push(mediaImageUrl(item.hqSha256));
			platform.ctx.waitUntil(purgeUrls(platform.env, urls));
		}
		return { success: true };
	},

	delete: async ({ params, platform, locals }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		if (!isAdmin(locals.user?.id)) return fail(403, { error: 'admin only' });

		const db = getDatabase(platform.env);
		const item = await getMediaItem(db, params.mid);
		if (!item) redirect(303, '/@/media');

		await deleteMediaItem(db, params.mid);

		if (platform.ctx) {
			const urls = [mediaObjectUrl(params.mid), mediaImageUrl(item.displaySha256)];
			if (item.hqSha256) urls.push(mediaImageUrl(item.hqSha256));
			platform.ctx.waitUntil(purgeUrls(platform.env, urls));
		}
		redirect(303, '/@/media');
	}
};
