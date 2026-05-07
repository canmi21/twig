import { describe, expect, it } from 'vitest';
import { DEFAULT_HOSTS } from '$lib/cdn/hosts';
import {
	EMOJI_FONT_IDS,
	LOADABLE_EMOJI_FONT_IDS,
	isEmojiFont,
	linksFor,
	renderEmojiLinks
} from '$lib/font/emoji-data';

describe('isEmojiFont', () => {
	it('accepts every id', () => {
		for (const id of EMOJI_FONT_IDS) expect(isEmojiFont(id)).toBe(true);
	});

	it('rejects unknown values', () => {
		expect(isEmojiFont('apple')).toBe(false);
		expect(isEmojiFont(null)).toBe(false);
	});
});

describe('LOADABLE_EMOJI_FONT_IDS', () => {
	it('excludes `system` (zero network)', () => {
		expect(LOADABLE_EMOJI_FONT_IDS).not.toContain('system');
	});
});

describe('linksFor', () => {
	it('returns [] for system', () => {
		expect(linksFor('system', DEFAULT_HOSTS)).toEqual([]);
	});

	it('twemoji ships one CSS from the package CDN', () => {
		const urls = linksFor('twemoji', DEFAULT_HOSTS);
		expect(urls).toHaveLength(1);
		expect(urls[0]).toBe('https://cdn.jsdelivr.net/npm/twemoji-colr-font@15.0.3/twemoji.css');
	});

	it('noto ships one unsplit Google Fonts CSS', () => {
		const urls = linksFor('noto', DEFAULT_HOSTS);
		expect(urls).toHaveLength(1);
		expect(urls[0]).toBe('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
	});
});

describe('renderEmojiLinks — orchestration', () => {
	it('returns empty for system outside /settings', () => {
		expect(renderEmojiLinks('system', false, DEFAULT_HOSTS)).toBe('');
	});

	it('/settings preloads both loadable choices even when current is system', () => {
		const out = renderEmojiLinks('system', true, DEFAULT_HOSTS);
		expect(out).toContain('twemoji.css');
		expect(out).toContain('family=Noto+Color+Emoji');
	});

	it('emits package-CDN preconnect only when twemoji is included', () => {
		const notoOnly = renderEmojiLinks('noto', false, DEFAULT_HOSTS);
		expect(notoOnly).not.toContain('rel="preconnect" href="https://cdn.jsdelivr.net"');
		const twemojiOnly = renderEmojiLinks('twemoji', false, DEFAULT_HOSTS);
		expect(twemojiOnly).toContain('rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin');
	});

	it('emits Google Fonts preconnect pair when noto is included', () => {
		const out = renderEmojiLinks('noto', false, DEFAULT_HOSTS);
		expect(out).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
		expect(out).toContain('rel="preconnect" href="https://fonts.gstatic.com" crossorigin');
	});

	it('tags stylesheets with data-emoji-link', () => {
		const out = renderEmojiLinks('noto', false, DEFAULT_HOSTS);
		expect(out).toContain('data-emoji-link');
	});
});
