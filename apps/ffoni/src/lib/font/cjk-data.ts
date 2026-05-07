import type { CdnHosts } from '$lib/cdn/hosts';

export type CjkFont = 'system' | 'noto' | 'lxgw';
export type CjkLang = 'sc' | 'tc' | 'jp';

export const CJK_FONT_COOKIE = 'cjk_font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// LXGW WenKai ships via CMBill's cn-font-split chunked packages on jsDelivr.
// Pinned to the exact release synced from upstream — bump these two constants
// (and the version note in spec/styling.md) when picking up a new upstream.
const LXGW_SC_PKG = '@callmebill/lxgw-wenkai-web@1.522.0';
const LXGW_TC_PKG = 'lxgw-wenkai-tc-web@1.320.0';

// LXGW ships 3 static weights. We declare all three so browsers lazy-load the
// weight that each element actually renders (font-light → 300, base → 400,
// font-medium → 500). font-semibold/bold synthesize from 500.
const LXGW_WEIGHTS = ['light', 'regular', 'medium'] as const;

const KLEE_PARAMS = 'family=Klee+One:wght@400;600';
const NOTO_SC_PARAMS = 'family=Noto+Sans+SC:wght@400;500;600;700';
const NOTO_TC_PARAMS = 'family=Noto+Sans+TC:wght@400;500;600;700';
const NOTO_JP_PARAMS = 'family=Noto+Sans+JP:wght@400;500;600;700';

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

export function linksFor(cjk: CjkFont, langs: readonly CjkLang[], hosts: CdnHosts): string[] {
	if (cjk === 'system') return [];

	if (cjk === 'noto') {
		const families: string[] = [];
		if (langs.includes('sc')) families.push(NOTO_SC_PARAMS);
		if (langs.includes('tc')) families.push(NOTO_TC_PARAMS);
		if (langs.includes('jp')) families.push(NOTO_JP_PARAMS);
		if (families.length === 0) return [];
		return [`https://${hosts.fontsCss}/css2?${families.join('&')}&display=swap`];
	}

	const scBase = `https://${hosts.packageCdn}/npm/${LXGW_SC_PKG}`;
	const tcBase = `https://${hosts.packageCdn}/npm/${LXGW_TC_PKG}`;
	const urls: string[] = [];
	if (langs.includes('sc')) {
		for (const w of LXGW_WEIGHTS) urls.push(`${scBase}/lxgwwenkai-${w}/result.css`);
	}
	if (langs.includes('tc')) {
		for (const w of LXGW_WEIGHTS) urls.push(`${tcBase}/lxgwwenkaitc-${w}/result.css`);
	}
	if (langs.includes('jp')) {
		urls.push(`https://${hosts.fontsCss}/css2?${KLEE_PARAMS}&display=swap`);
	}
	return urls;
}

// /settings preloads every choice for previews; simplified and traditional
// are never loaded together due to CJK-unified codepoint glyph conflicts.
export function renderCjkLinks(
	cjk: CjkFont,
	htmlLang: string,
	isSettings: boolean,
	hosts: CdnHosts
): string {
	const choices: CjkFont[] = isSettings
		? (['noto', 'lxgw'] as const).slice()
		: cjk === 'system'
			? []
			: [cjk];
	if (choices.length === 0) return '';

	const langs = langsForHtmlLang(htmlLang);
	const seen = new Set<string>();
	const body: string[] = [];
	let needsPkgCdn = false;
	let needsFontsCdn = false;
	for (const choice of choices) {
		for (const url of linksFor(choice, langs, hosts)) {
			if (seen.has(url)) continue;
			seen.add(url);
			body.push(`<link rel="stylesheet" href="${url}" data-cjk-link>`);
			if (url.includes(hosts.packageCdn)) needsPkgCdn = true;
			if (url.includes(hosts.fontsCss)) needsFontsCdn = true;
		}
	}
	if (body.length === 0) return '';

	const pre: string[] = [];
	if (needsPkgCdn)
		pre.push(`<link rel="preconnect" href="https://${hosts.packageCdn}" crossorigin>`);
	if (needsFontsCdn) {
		pre.push(`<link rel="preconnect" href="https://${hosts.fontsCss}">`);
		pre.push(`<link rel="preconnect" href="https://${hosts.fontsStatic}" crossorigin>`);
	}
	return [...pre, ...body].join('');
}
