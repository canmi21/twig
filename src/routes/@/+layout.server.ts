import type { LayoutServerLoad } from './$types';

// Cookie-backed so SSR renders the right width and reload doesn't
// flash the expanded state before the client-side preference applies.
export const load: LayoutServerLoad = async ({ cookies }) => {
	return {
		adminSidebarCollapsed: cookies.get('twig:admin-sidebar') === 'collapsed'
	};
};
