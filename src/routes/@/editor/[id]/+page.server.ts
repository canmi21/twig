import { error, fail, redirect } from '@sveltejs/kit';
import { validateDoc } from '$lib/content/schema';
import { getDatabase } from '$lib/server/database';
import { deletePost, getPost, savePostContent, setPublished } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform) error(500, 'platform bindings unavailable');
	const db = getDatabase(platform.env);
	const post = await getPost(db, params.id);
	if (!post) error(404, 'post not found');
	return { post };
};

export const actions: Actions = {
	save: async ({ request, params, platform }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		const db = getDatabase(platform.env);
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slug = String(form.get('slug') ?? '').trim();
		const descriptionRaw = String(form.get('description') ?? '').trim();
		const description = descriptionRaw === '' ? null : descriptionRaw;
		const rawContent = String(form.get('content') ?? '');

		if (slug === '') return fail(400, { error: 'slug required' });

		let doc;
		try {
			doc = validateDoc(JSON.parse(rawContent));
		} catch (err) {
			const message = err instanceof Error ? err.message : 'invalid content';
			return fail(400, { error: `content invalid: ${message.slice(0, 200)}` });
		}

		try {
			await savePostContent(db, platform.env.CACHE, params.id, {
				title,
				slug,
				description,
				doc
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: `save failed: ${message.slice(0, 200)}` });
		}

		return { success: true };
	},

	publish: async ({ params, platform }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		const db = getDatabase(platform.env);
		await setPublished(db, params.id, new Date());
		return { success: true };
	},

	unpublish: async ({ params, platform }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		const db = getDatabase(platform.env);
		await setPublished(db, params.id, null);
		return { success: true };
	},

	delete: async ({ params, platform }) => {
		if (!platform) return fail(500, { error: 'platform bindings unavailable' });
		const db = getDatabase(platform.env);
		await deletePost(db, platform.env.CACHE, params.id);
		redirect(303, '/@/editor');
	}
};
