export type CjkFont = 'system' | 'noto' | 'lxgw';
export type CjkLang = 'sc' | 'tc' | 'jp';

export const CJK_FONT_COOKIE = 'cjk_font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// LXGW WenKai ships via CMBill's cn-font-split chunked packages on jsDelivr.
// Pinned to the exact release synced from upstream — bump these two constants
// (and the version note in spec/styling.md) when picking up a new upstream.
const LXGW_SC_BASE = 'https://cdn.jsdelivr.net/npm/@callmebill/lxgw-wenkai-web@1.522.0';
const LXGW_TC_BASE = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-tc-web@1.320.0';

// LXGW ships 3 static weights. We declare all three so browsers lazy-load the
// weight that each element actually renders (font-light → 300, base → 400,
// font-medium → 500). font-semibold/bold synthesize from 500.
const LXGW_WEIGHTS = ['light', 'regular', 'medium'] as const;

const GOOGLE_KLEE = 'family=Klee+One:wght@400;600';
const GOOGLE_NOTO_SC = 'family=Noto+Sans+SC:wght@400;500;600;700';
const GOOGLE_NOTO_TC = 'family=Noto+Sans+TC:wght@400;500;600;700';
const GOOGLE_NOTO_JP = 'family=Noto+Sans+JP:wght@400;500;600;700';

// Card labels. The LXGW pack swaps to "Klee One" on Japanese pages because
// that's the actual face rendering JP text (LXGW WenKai doesn't ship JP; we
// mix in Klee One, which LXGW itself was derived from, for the JP slot).
export const CJK_FONT_LABELS: Record<CjkFont, { default: string; ja?: string }> = {
	system: { default: 'System' },
	noto: { default: 'Noto Sans' },
	lxgw: { default: 'LXGW WenKai', ja: 'Klee One' }
};

// Font family strings per choice × language. Feeds sample card previews and
// the --font-cjk-* CSS variables in tokens.css.
export const CJK_FAMILIES: Record<CjkFont, { sc: string; tc: string; jp: string }> = {
	system: {
		sc: 'system-ui',
		tc: 'system-ui',
		jp: 'system-ui'
	},
	noto: {
		sc: '"Noto Sans SC", sans-serif',
		tc: '"Noto Sans TC", sans-serif',
		jp: '"Noto Sans JP", sans-serif'
	},
	lxgw: {
		sc: '"LXGW WenKai", serif',
		tc: '"LXGW WenKai TC", serif',
		jp: '"Klee One", serif'
	}
};

export const CJK_FONT_IDS: CjkFont[] = ['system', 'noto', 'lxgw'];

export function isCjkFont(v: unknown): v is CjkFont {
	return v === 'system' || v === 'noto' || v === 'lxgw';
}

export function labelFor(cjk: CjkFont, htmlLang: string): string {
	const entry = CJK_FONT_LABELS[cjk];
	if (htmlLang.startsWith('ja') && entry.ja) return entry.ja;
	return entry.default;
}

// Page language → [primary CJK, coexisting fallback CJK]. Simplified and
// Traditional never coexist (same code points, conflicting glyphs); Japanese
// coexists with SC as the most common mixed-page pairing.
export function langsForHtmlLang(htmlLang: string): CjkLang[] {
	if (htmlLang.startsWith('ja')) return ['jp', 'sc'];
	if (htmlLang === 'zh-TW' || htmlLang.startsWith('zh-Hant')) return ['tc', 'jp'];
	return ['sc', 'jp'];
}

function linksFor(cjk: CjkFont, langs: readonly CjkLang[]): string[] {
	if (cjk === 'system') return [];

	if (cjk === 'noto') {
		const families: string[] = [];
		if (langs.includes('sc')) families.push(GOOGLE_NOTO_SC);
		if (langs.includes('tc')) families.push(GOOGLE_NOTO_TC);
		if (langs.includes('jp')) families.push(GOOGLE_NOTO_JP);
		if (families.length === 0) return [];
		return [`https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`];
	}

	const urls: string[] = [];
	if (langs.includes('sc')) {
		for (const w of LXGW_WEIGHTS) urls.push(`${LXGW_SC_BASE}/lxgwwenkai-${w}/result.css`);
	}
	if (langs.includes('tc')) {
		for (const w of LXGW_WEIGHTS) urls.push(`${LXGW_TC_BASE}/lxgwwenkaitc-${w}/result.css`);
	}
	if (langs.includes('jp')) {
		urls.push(`https://fonts.googleapis.com/css2?${GOOGLE_KLEE}&display=swap`);
	}
	return urls;
}

// SSR entry. /settings loads every CJK choice so previews can render their
// own glyphs; elsewhere only the selected choice ships. Language scope is
// always (primary, fallback) — simplified + traditional are never loaded
// together to avoid CJK-unified-code-point glyph conflicts.
export function renderCjkLinks(cjk: CjkFont, htmlLang: string, isSettings: boolean): string {
	const choices: CjkFont[] = isSettings
		? (['noto', 'lxgw'] as const).slice()
		: cjk === 'system'
			? []
			: [cjk];
	if (choices.length === 0) return '';

	const langs = langsForHtmlLang(htmlLang);
	const seen = new Set<string>();
	const body: string[] = [];
	for (const choice of choices) {
		for (const url of linksFor(choice, langs)) {
			if (seen.has(url)) continue;
			seen.add(url);
			body.push(`<link rel="stylesheet" href="${url}" data-cjk-link>`);
		}
	}
	if (body.length === 0) return '';

	return ['<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>', ...body].join('');
}

export function setCjkFontCookie(cjk: CjkFont): void {
	document.cookie = `${CJK_FONT_COOKIE}=${cjk};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

const loadedRuntime = new Set<string>();

function hasLinkInDom(href: string): boolean {
	return document.head.querySelector(`link[href="${href}"]`) !== null;
}

function injectLinks(urls: string[]): void {
	for (const url of urls) {
		if (loadedRuntime.has(url) || hasLinkInDom(url)) {
			loadedRuntime.add(url);
			continue;
		}
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = url;
		link.dataset.cjkLink = '';
		document.head.appendChild(link);
		loadedRuntime.add(url);
	}
}

export function ensureCjkLoadedForPage(cjk: CjkFont): void {
	const langs = langsForHtmlLang(document.documentElement.lang);
	injectLinks(linksFor(cjk, langs));
}

export function ensureAllCjkLoaded(): void {
	const langs = langsForHtmlLang(document.documentElement.lang);
	for (const cjk of ['noto', 'lxgw'] as const) {
		injectLinks(linksFor(cjk, langs));
	}
}

export function applyCjkFont(cjk: CjkFont): void {
	ensureCjkLoadedForPage(cjk);
	setCjkFontCookie(cjk);
	document.documentElement.dataset.cjk = cjk;
}
