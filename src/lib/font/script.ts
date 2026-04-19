import { getClientCdnHosts, type CdnHosts } from '$lib/cdn/hosts';

export type FontFamily = 'system' | 'inter' | 'roboto' | 'source-sans';

export const FONT_COOKIE = 'font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// `system` renders with the platform default and never hits Google Fonts.
// `googleFamily` is the `family=` query param segment (without weights); weights
// are appended centrally by `buildFontsHref` so every font ships the same set.
export const FONTS = {
	system: {
		label: 'System',
		googleFamily: null,
		stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
	},
	inter: {
		label: 'Inter',
		googleFamily: 'Inter',
		stack: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif'
	},
	roboto: {
		label: 'Roboto',
		googleFamily: 'Roboto',
		stack: '"Roboto", ui-sans-serif, system-ui, -apple-system, sans-serif'
	},
	'source-sans': {
		label: 'Source Sans',
		googleFamily: 'Source Sans 3',
		stack: '"Source Sans 3", ui-sans-serif, system-ui, -apple-system, sans-serif'
	}
} as const satisfies Record<
	FontFamily,
	{ label: string; googleFamily: string | null; stack: string }
>;

export const FONT_IDS = Object.keys(FONTS) as FontFamily[];
export const LOADABLE_FONT_IDS = FONT_IDS.filter((id) => FONTS[id].googleFamily !== null);

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
		const family = FONTS[id].googleFamily;
		if (family === null) continue;
		params.push(`family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${WEIGHTS}`);
	}
	if (params.length === 0) return null;
	return `https://${hosts.googleFontsCss}/css2?${params.join('&')}&display=swap`;
}

// SSR-rendered <link> tags for the given font set. Tagged with data-font-ids
// so the client can detect "SSR already loaded these" and skip re-injection.
export function renderFontLinks(ids: readonly FontFamily[], hosts: CdnHosts): string {
	const href = buildFontsHref(ids, hosts);
	if (!href) return '';
	const tag = ids.filter((id) => FONTS[id].googleFamily !== null).join(' ');
	return [
		`<link rel="preconnect" href="https://${hosts.googleFontsCss}">`,
		`<link rel="preconnect" href="https://${hosts.googleFontsStatic}" crossorigin>`,
		`<link rel="stylesheet" href="${href}" data-font-ids="${tag}">`
	].join('');
}

export function setFontCookie(font: FontFamily): void {
	document.cookie = `${FONT_COOKIE}=${font};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

// Tracks fonts we've injected at runtime so /settings → other route → back
// doesn't duplicate <link> tags or re-download.
const loadedRuntime = new Set<FontFamily>();

function hasSsrLink(id: FontFamily): boolean {
	const existing = document.head.querySelectorAll<HTMLLinkElement>('link[data-font-ids]');
	for (const el of existing) {
		if (el.dataset.fontIds?.split(' ').includes(id)) return true;
	}
	return false;
}

// Inject one <link> for a single font if it isn't already present from SSR or
// a prior runtime load. No-op for `system` and for anything already loaded.
export function ensureFontLoaded(id: FontFamily): void {
	if (FONTS[id].googleFamily === null) return;
	if (loadedRuntime.has(id) || hasSsrLink(id)) return;
	const href = buildFontsHref([id], getClientCdnHosts());
	if (!href) return;
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = href;
	link.dataset.fontIds = id;
	document.head.appendChild(link);
	loadedRuntime.add(id);
}

export function ensureAllFontsLoaded(): void {
	for (const id of LOADABLE_FONT_IDS) ensureFontLoaded(id);
}

// Swap the active font: make sure the <link> is present, persist the choice,
// flip the data attribute that tokens.css selects on. font-display:swap handles
// the brief fallback render if the stylesheet is still inflight.
export function applyFont(id: FontFamily): void {
	ensureFontLoaded(id);
	setFontCookie(id);
	document.documentElement.dataset.font = id;
}
