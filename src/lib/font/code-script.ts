export type CodeFont = 'monospace' | 'maple' | 'jetbrains' | 'fira';

export const CODE_FONT_COOKIE = 'code_font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Maple Mono lives outside Google Fonts; Fontsource mirrors it on jsDelivr with
// the same unicode-range + font-display: swap shape as Google's CSS, so a link
// tag only registers @font-face declarations — actual woff2 files don't fetch
// until an element renders a glyph that needs them. Pinned to patch; bump here
// and in spec/styling.md in one commit.
const MAPLE_BASE = 'https://cdn.jsdelivr.net/npm/@fontsource/maple-mono@5.2.6';

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
function linksFor(code: CodeFont): string[] {
	if (code === 'monospace') return [];
	if (code === 'maple') {
		return [`${MAPLE_BASE}/latin-400.css`, `${MAPLE_BASE}/latin-700.css`];
	}
	if (code === 'jetbrains') {
		return ['https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap'];
	}
	return ['https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap'];
}

// SSR entry. /settings preloads every loadable choice so preview cards render
// their own faces; elsewhere only the selected choice ships. `monospace` maps
// to the CSS generic and needs zero network.
export function renderCodeLinks(code: CodeFont, isSettings: boolean): string {
	const choices: CodeFont[] = isSettings
		? LOADABLE_CODE_FONT_IDS
		: code === 'monospace'
			? []
			: [code];
	if (choices.length === 0) return '';

	const seen = new Set<string>();
	const body: string[] = [];
	for (const choice of choices) {
		for (const url of linksFor(choice)) {
			if (seen.has(url)) continue;
			seen.add(url);
			body.push(`<link rel="stylesheet" href="${url}" data-code-link>`);
		}
	}
	if (body.length === 0) return '';

	const usesGoogle = choices.some((c) => c === 'jetbrains' || c === 'fira');
	const usesJsdelivr = choices.includes('maple');
	const pre: string[] = [];
	if (usesJsdelivr) pre.push('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>');
	if (usesGoogle) {
		pre.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
		pre.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
	}
	return [...pre, ...body].join('');
}

export function setCodeFontCookie(code: CodeFont): void {
	document.cookie = `${CODE_FONT_COOKIE}=${code};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
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
		link.dataset.codeLink = '';
		document.head.appendChild(link);
		loadedRuntime.add(url);
	}
}

export function ensureCodeLoadedForPage(code: CodeFont): void {
	injectLinks(linksFor(code));
}

export function ensureAllCodeLoaded(): void {
	for (const code of LOADABLE_CODE_FONT_IDS) {
		injectLinks(linksFor(code));
	}
}

export function applyCodeFont(code: CodeFont): void {
	ensureCodeLoadedForPage(code);
	setCodeFontCookie(code);
	document.documentElement.dataset.codeFont = code;
}
