import type { CdnHosts } from '$lib/cdn/hosts';

export type EmojiFont = 'system' | 'twemoji' | 'noto';

export const EMOJI_FONT_COOKIE = 'emoji_font';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Mozilla's twemoji-colr .ttf isn't jsDelivr-mirrored; this npm repackage
// provides the woff2 + @font-face we use instead. Pin to patch.
const TWEMOJI_PKG = 'twemoji-colr-font@15.0.3/twemoji.css';
// Google Fonts serves Noto Color Emoji as a single woff2 with font-display: swap.
// No subset split — emoji presentation sequences must stay intact across
// unicode-range slices, so the whole face ships as one file (~410 KB).
const NOTO_PARAMS = 'family=Noto+Color+Emoji&display=swap';

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

export function linksFor(emoji: EmojiFont, hosts: CdnHosts): string[] {
	if (emoji === 'system') return [];
	if (emoji === 'twemoji') return [`https://${hosts.packageCdn}/npm/${TWEMOJI_PKG}`];
	return [`https://${hosts.fontsCss}/css2?${NOTO_PARAMS}`];
}

// SSR entry. /settings preloads every loadable choice so preview cards render
// their own faces; elsewhere only the selected choice ships. `system` maps to
// the OS emoji font and needs zero network.
export function renderEmojiLinks(emoji: EmojiFont, isSettings: boolean, hosts: CdnHosts): string {
	const choices: EmojiFont[] = isSettings
		? LOADABLE_EMOJI_FONT_IDS
		: emoji === 'system'
			? []
			: [emoji];
	if (choices.length === 0) return '';

	const seen = new Set<string>();
	const body: string[] = [];
	for (const choice of choices) {
		for (const url of linksFor(choice, hosts)) {
			if (seen.has(url)) continue;
			seen.add(url);
			body.push(`<link rel="stylesheet" href="${url}" data-emoji-link>`);
		}
	}
	if (body.length === 0) return '';

	const usesFontsCdn = choices.includes('noto');
	const usesPkgCdn = choices.includes('twemoji');
	const pre: string[] = [];
	if (usesPkgCdn)
		pre.push(`<link rel="preconnect" href="https://${hosts.packageCdn}" crossorigin>`);
	if (usesFontsCdn) {
		pre.push(`<link rel="preconnect" href="https://${hosts.fontsCss}">`);
		pre.push(`<link rel="preconnect" href="https://${hosts.fontsStatic}" crossorigin>`);
	}
	return [...pre, ...body].join('');
}
