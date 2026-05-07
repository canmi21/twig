import { describe, expect, it } from 'vitest';
import { hasLangCookie, resolveLocaleFromAcceptLanguage, upsertCookie } from '$lib/i18n/negotiate';

describe('upsertCookie', () => {
	it('appends to an empty header', () => {
		expect(upsertCookie('', 'language', 'en')).toBe('language=en');
	});

	it('appends when the cookie does not exist', () => {
		expect(upsertCookie('theme=dark', 'language', 'zh')).toBe('theme=dark; language=zh');
	});

	it('replaces an existing cookie at the start', () => {
		expect(upsertCookie('language=en; theme=dark', 'language', 'ja')).toBe(
			'language=ja; theme=dark'
		);
	});

	it('replaces an existing cookie in the middle', () => {
		expect(upsertCookie('a=1; language=en; b=2', 'language', 'tw')).toBe('a=1; language=tw; b=2');
	});

	it('does not match a prefix-overlapping name', () => {
		// `language_ext` should not be matched when upserting `language`
		expect(upsertCookie('language_ext=x', 'language', 'en')).toBe('language_ext=x; language=en');
	});
});

describe('hasLangCookie', () => {
	it('detects cookie at the start', () => {
		expect(hasLangCookie('language=en; theme=dark')).toBe(true);
	});

	it('detects cookie in the middle', () => {
		expect(hasLangCookie('a=1; language=zh; b=2')).toBe(true);
	});

	it('returns false when absent', () => {
		expect(hasLangCookie('theme=dark')).toBe(false);
	});

	it('returns false for null', () => {
		expect(hasLangCookie(null)).toBe(false);
	});
});

describe('resolveLocaleFromAcceptLanguage', () => {
	it('returns en for null header', () => {
		expect(resolveLocaleFromAcceptLanguage(null)).toBe('en');
	});

	it('returns en for empty header', () => {
		expect(resolveLocaleFromAcceptLanguage('')).toBe('en');
	});

	it('maps zh-TW to tw', () => {
		expect(resolveLocaleFromAcceptLanguage('zh-TW')).toBe('tw');
	});

	it('maps zh-HK to tw (Traditional)', () => {
		expect(resolveLocaleFromAcceptLanguage('zh-HK')).toBe('tw');
	});

	it('maps zh-MO to tw (Traditional)', () => {
		expect(resolveLocaleFromAcceptLanguage('zh-MO')).toBe('tw');
	});

	it('maps zh-Hant-HK to tw via startsWith', () => {
		expect(resolveLocaleFromAcceptLanguage('zh-Hant-HK')).toBe('tw');
	});

	it('maps plain zh to zh (Simplified)', () => {
		expect(resolveLocaleFromAcceptLanguage('zh')).toBe('zh');
	});

	it('maps zh-CN to zh (Simplified)', () => {
		expect(resolveLocaleFromAcceptLanguage('zh-CN')).toBe('zh');
	});

	it('maps en-US to en', () => {
		expect(resolveLocaleFromAcceptLanguage('en-US')).toBe('en');
	});

	it('maps ja to ja', () => {
		expect(resolveLocaleFromAcceptLanguage('ja')).toBe('ja');
	});

	it('maps ja-JP to ja', () => {
		expect(resolveLocaleFromAcceptLanguage('ja-JP')).toBe('ja');
	});

	it('respects quality factors — highest-q match wins', () => {
		// Japanese preferred over English
		expect(resolveLocaleFromAcceptLanguage('en;q=0.5, ja;q=0.9')).toBe('ja');
	});

	it('picks Traditional Chinese over Simplified when q is higher', () => {
		expect(resolveLocaleFromAcceptLanguage('zh-CN;q=0.8, zh-TW;q=0.9')).toBe('tw');
	});

	it('falls back to en for unrecognised languages', () => {
		expect(resolveLocaleFromAcceptLanguage('ko, fr;q=0.8')).toBe('en');
	});
});
