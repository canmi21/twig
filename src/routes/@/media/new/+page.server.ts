import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth-roles';
import type { PageServerLoad } from './$types';

// Admin gate. Upload logic lives entirely on the client (see
// `$lib/media/pipeline`) and posts to `/api/media/upload`, so the page
// itself has no server data — just the permission check.
export const load: PageServerLoad = async ({ locals }) => {
	if (!isAdmin(locals.user?.id)) error(403, 'admin only');
	return {};
};
