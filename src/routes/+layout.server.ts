import { dev } from '$app/environment';
import { isAdmin } from '$lib/server/auth-roles';
import type { LayoutServerLoad } from './$types';

const SITE_STARTED_AT = new Date('2024-10-11T06:24:59+08:00').getTime();
const MS_PER_DAY = 86_400_000;

export const load: LayoutServerLoad = ({ locals }) => {
	const runtimeDays = Math.max(0, Math.floor((Date.now() - SITE_STARTED_AT) / MS_PER_DAY));
	// Only ship the DevOverlay payload in vite dev — prod bundle never sees
	// the field, the overlay component is dead-stripped by the {#if dev} gate
	// in +layout.svelte, and unauthenticated visitors don't pay the cost.
	const devUser =
		dev && locals.user
			? { id: locals.user.id, email: locals.user.email, isAdmin: isAdmin(locals.user.id) }
			: null;
	return {
		theme: locals.theme,
		font: locals.font,
		cjkFont: locals.cjkFont,
		codeFont: locals.codeFont,
		emojiFont: locals.emojiFont,
		htmlLang: locals.htmlLang,
		runtimeDays,
		cdn: locals.cdn,
		devUser
	};
};
