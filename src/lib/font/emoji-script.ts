export type EmojiFont = 'system' | 'twemoji' | 'noto';

export const EMOJI_FONT_COOKIE = 'emoji_font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Twemoji ships as a COLR/CPAL color font, not an image asset. Mozilla's source
// repo (mozilla/twemoji-colr) only publishes the .ttf as a GitHub release
// artifact, which jsDelivr doesn't mirror. Tilman Vatteroth's npm build tracks
// upstream Twemoji at the same version and provides a ready woff2 + @font-face
// stylesheet; pin to patch and bump in spec/styling.md in the same commit.
const TWEMOJI_CSS = 'https://cdn.jsdelivr.net/npm/twemoji-colr-font@15.0.3/twemoji.css';
// Google Fonts serves Noto Color Emoji as a single woff2 with font-display: swap.
// No subset split — emoji presentation sequences must stay intact across
// unicode-range slices, so the whole face ships as one file (~410 KB).
const NOTO_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';

export const EMOJI_FONT_LABELS: Record<EmojiFont, string> = {
	system: 'System',
	twemoji: 'Twemoji',
	noto: 'Noto Emoji'
};

// Inline font-family for preview cards. Specific face first, OS emoji families
// as fallback so the card still shows a color glyph before the woff2 finishes
// downloading (and for any codepoint the face doesn't cover).
export const EMOJI_FAMILIES: Record<EmojiFont, string> = {
	system: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"',
	twemoji: '"Twemoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"',
	noto: '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"'
};

export const EMOJI_FONT_IDS: EmojiFont[] = ['system', 'twemoji', 'noto'];
export const LOADABLE_EMOJI_FONT_IDS: EmojiFont[] = ['twemoji', 'noto'];

export function isEmojiFont(v: unknown): v is EmojiFont {
	return v === 'system' || v === 'twemoji' || v === 'noto';
}

function linksFor(emoji: EmojiFont): string[] {
	if (emoji === 'system') return [];
	if (emoji === 'twemoji') return [TWEMOJI_CSS];
	return [NOTO_CSS];
}

// SSR entry. /settings preloads every loadable choice so preview cards render
// their own faces; elsewhere only the selected choice ships. `system` maps to
// the OS emoji font and needs zero network.
export function renderEmojiLinks(emoji: EmojiFont, isSettings: boolean): string {
	const choices: EmojiFont[] = isSettings
		? LOADABLE_EMOJI_FONT_IDS
		: emoji === 'system'
			? []
			: [emoji];
	if (choices.length === 0) return '';

	const seen = new Set<string>();
	const body: string[] = [];
	for (const choice of choices) {
		for (const url of linksFor(choice)) {
			if (seen.has(url)) continue;
			seen.add(url);
			body.push(`<link rel="stylesheet" href="${url}" data-emoji-link>`);
		}
	}
	if (body.length === 0) return '';

	const usesGoogle = choices.includes('noto');
	const usesJsdelivr = choices.includes('twemoji');
	const pre: string[] = [];
	if (usesJsdelivr) pre.push('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>');
	if (usesGoogle) {
		pre.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
		pre.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
	}
	return [...pre, ...body].join('');
}

export function setEmojiFontCookie(emoji: EmojiFont): void {
	document.cookie = `${EMOJI_FONT_COOKIE}=${emoji};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
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
		link.dataset.emojiLink = '';
		document.head.appendChild(link);
		loadedRuntime.add(url);
	}
}

export function ensureEmojiLoadedForPage(emoji: EmojiFont): void {
	injectLinks(linksFor(emoji));
}

export function ensureAllEmojiLoaded(): void {
	for (const emoji of LOADABLE_EMOJI_FONT_IDS) {
		injectLinks(linksFor(emoji));
	}
}

export function applyEmojiFont(emoji: EmojiFont): void {
	ensureEmojiLoadedForPage(emoji);
	setEmojiFontCookie(emoji);
	document.documentElement.dataset.emoji = emoji;
}
