import type { CdnHosts } from '$lib/cdn/hosts';

export type FontFamily = 'system' | 'inter' | 'roboto' | 'source-sans';

export const FONT_COOKIE = 'font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// `system` renders with the platform default and never hits the remote CSS
// endpoint. `remoteFamily` is the `family=` query param segment (without
// weights); weights are appended centrally by `buildFontsHref` so every font
// ships the same set.
export const FONTS = {
	system: {
		label: 'System',
		remoteFamily: null,
		stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
	},
	inter: {
		label: 'Inter',
		remoteFamily: 'Inter',
		stack: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif'
	},
	roboto: {
		label: 'Roboto',
		remoteFamily: 'Roboto',
		stack: '"Roboto", ui-sans-serif, system-ui, -apple-system, sans-serif'
	},
	'source-sans': {
		label: 'Source Sans',
		remoteFamily: 'Source Sans 3',
		stack: '"Source Sans 3", ui-sans-serif, system-ui, -apple-system, sans-serif'
	}
} as const satisfies Record<
	FontFamily,
	{ label: string; remoteFamily: string | null; stack: string }
>;

export const FONT_IDS = Object.keys(FONTS) as FontFamily[];
export const LOADABLE_FONT_IDS = FONT_IDS.filter((id) => FONTS[id].remoteFamily !== null);

const WEIGHTS = '400;500;600;700';

export function isFontFamily(value: unknown): value is FontFamily {
	return typeof value === 'string' && value in FONTS;
}

// Collapse multiple families into a single request so the browser opens one
// connection, one CSS parse, one cache entry. Host swaps to a mirror for
// blocked regions — loli.net's /css2 endpoint is wire-compatible.
export function buildFontsHref(ids: readonly FontFamily[], hosts: CdnHosts): string | null {
	const params: string[] = [];
	for (const id of ids) {
		const family = FONTS[id].remoteFamily;
		if (family === null) continue;
		params.push(`family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${WEIGHTS}`);
	}
	if (params.length === 0) return null;
	return `https://${hosts.fontsCss}/css2?${params.join('&')}&display=swap`;
}

// SSR-rendered <link> tags for the given font set. Tagged with data-font-ids
// so the client can detect "SSR already loaded these" and skip re-injection.
export function renderFontLinks(ids: readonly FontFamily[], hosts: CdnHosts): string {
	const href = buildFontsHref(ids, hosts);
	if (!href) return '';
	const tag = ids.filter((id) => FONTS[id].remoteFamily !== null).join(' ');
	return [
		`<link rel="preconnect" href="https://${hosts.fontsCss}">`,
		`<link rel="preconnect" href="https://${hosts.fontsStatic}" crossorigin>`,
		`<link rel="stylesheet" href="${href}" data-font-ids="${tag}">`
	].join('');
}
