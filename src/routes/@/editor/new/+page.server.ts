import { error, redirect } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/database';
import { createEmptyPost } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

// A load-only route: navigating here creates a fresh draft row and
// redirects to its edit page. Keeps the "New post" button a plain link.
export const load: PageServerLoad = async ({ platform }) => {
	if (!platform) error(500, 'platform bindings unavailable');
	const db = getDatabase(platform.env);
	const id = await createEmptyPost(db);
	redirect(303, `/@/editor/${id}`);
};
