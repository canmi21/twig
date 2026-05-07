import { getClientCdnHosts } from '$lib/cdn/hosts';
import {
	buildFontsHref,
	COOKIE_MAX_AGE,
	FONT_COOKIE,
	FONTS,
	LOADABLE_FONT_IDS,
	type FontFamily
} from './data';

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
	if (FONTS[id].remoteFamily === null) return;
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
