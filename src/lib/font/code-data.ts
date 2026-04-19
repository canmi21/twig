import type { CdnHosts } from '$lib/cdn/hosts';

export type CodeFont = 'monospace' | 'maple' | 'jetbrains' | 'fira';

export const CODE_FONT_COOKIE = 'code_font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Maple Mono lives outside Google Fonts; Fontsource mirrors it on jsDelivr with
// the same unicode-range + font-display: swap shape as Google's CSS, so a link
// tag only registers @font-face declarations — actual woff2 files don't fetch
// until an element renders a glyph that needs them. Pinned to patch; bump here
// and in spec/styling.md in one commit.
const MAPLE_PKG = '@fontsource/maple-mono@5.2.6';

export const CODE_FONT_LABELS: Record<CodeFont, string> = {
	monospace: 'Monospace',
	maple: 'Maple Mono',
	jetbrains: 'JetBrains Mono',
	fira: 'Fira Code'
};

// Feeds the preview card's inline font-family. Specific face comes first so
// the card demonstrates that face; the generic tail keeps glyph coverage if
// the face hasn't finished loading.
export const CODE_FAMILIES: Record<CodeFont, string> = {
	monospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
	maple: '"Maple Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
	jetbrains: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
	fira: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
};

export const CODE_FONT_IDS: CodeFont[] = ['monospace', 'maple', 'jetbrains', 'fira'];
export const LOADABLE_CODE_FONT_IDS: CodeFont[] = ['maple', 'jetbrains', 'fira'];

export function isCodeFont(v: unknown): v is CodeFont {
	return v === 'monospace' || v === 'maple' || v === 'jetbrains' || v === 'fira';
}

// 400 for body code, 700 reserved for future syntax-highlighting bold tokens.
// Google bundles both weights into one CSS with unicode-range per weight;
// Fontsource splits them across two stylesheets. Neither approach pre-pulls
// woff2 — font-display: swap + unicode-range defer the actual download until
// a rendered glyph demands the weight.
export function linksFor(code: CodeFont, hosts: CdnHosts): string[] {
	if (code === 'monospace') return [];
	if (code === 'maple') {
		const base = `https://${hosts.packageCdn}/npm/${MAPLE_PKG}`;
		return [`${base}/latin-400.css`, `${base}/latin-700.css`];
	}
	if (code === 'jetbrains') {
		return [`https://${hosts.fontsCss}/css2?family=JetBrains+Mono:wght@400;700&display=swap`];
	}
	return [`https://${hosts.fontsCss}/css2?family=Fira+Code:wght@400;700&display=swap`];
}

// SSR entry. /settings preloads every loadable choice so preview cards render
// their own faces; elsewhere only the selected choice ships. `monospace` maps
// to the CSS generic and needs zero network.
export function renderCodeLinks(code: CodeFont, isSettings: boolean, hosts: CdnHosts): string {
	const choices: CodeFont[] = isSettings
		? LOADABLE_CODE_FONT_IDS
		: code === 'monospace'
			? []
			: [code];
	if (choices.length === 0) return '';

	const seen = new Set<string>();
	const body: string[] = [];
	for (const choice of choices) {
		for (const url of linksFor(choice, hosts)) {
			if (seen.has(url)) continue;
			seen.add(url);
			body.push(`<link rel="stylesheet" href="${url}" data-code-link>`);
		}
	}
	if (body.length === 0) return '';

	const usesFontsCdn = choices.some((c) => c === 'jetbrains' || c === 'fira');
	const usesPkgCdn = choices.includes('maple');
	const pre: string[] = [];
	if (usesPkgCdn)
		pre.push(`<link rel="preconnect" href="https://${hosts.packageCdn}" crossorigin>`);
	if (usesFontsCdn) {
		pre.push(`<link rel="preconnect" href="https://${hosts.fontsCss}">`);
		pre.push(`<link rel="preconnect" href="https://${hosts.fontsStatic}" crossorigin>`);
	}
	return [...pre, ...body].join('');
}
