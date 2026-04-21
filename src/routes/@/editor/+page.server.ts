import { error } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/database';
import { listPosts } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform) error(500, 'platform bindings unavailable');
	const db = getDatabase(platform.env);
	const posts = await listPosts(db);
	return { posts };
};
