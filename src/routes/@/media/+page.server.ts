import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth-roles';
import { getDatabase } from '$lib/server/database';
import { isItemPublic, listMediaItems } from '$lib/server/media/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!platform) error(500, 'platform bindings unavailable');
	if (!isAdmin(locals.user?.id)) error(403, 'admin only');

	const db = getDatabase(platform.env);
	const rows = await listMediaItems(db);

	// Visibility is derived per item — one cheap query each. For a larger
	// corpus we'd batch with a single join, but the admin grid caps at 500
	// and the user base is one person, so the obvious loop is fine here.
	const items = await Promise.all(
		rows.map(async (row) => ({
			id: row.id,
			displaySha256: row.displaySha256,
			sourceWidth: row.sourceWidth,
			sourceHeight: row.sourceHeight,
			altText: row.altText,
			createdAt: row.createdAt.getTime(),
			isPublic: await isItemPublic(db, row.id)
		}))
	);

	return { items };
};
