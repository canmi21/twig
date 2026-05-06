import { describe, expect, it } from 'vitest';
import { canonicalPath, htmlLangFor, localizedPath, HTML_LANG } from '$lib/i18n/urls';

describe('htmlLangFor', () => {
	it('maps mw to zh (majority-Chinese base locale)', () => {
		expect(htmlLangFor('mw')).toBe('zh');
	});

	it('maps en to en-US', () => {
		expect(htmlLangFor('en')).toBe('en-US');
	});

	it('maps zh to zh-CN (Simplified)', () => {
		expect(htmlLangFor('zh')).toBe('zh-CN');
	});

	it('maps tw to zh-TW (Traditional)', () => {
		expect(htmlLangFor('tw')).toBe('zh-TW');
	});

	it('maps ja to ja-JP', () => {
		expect(htmlLangFor('ja')).toBe('ja-JP');
	});

	it('falls back to the input when the locale is unknown', () => {
		expect(htmlLangFor('ko')).toBe('ko');
	});

	it('exports the full locale table', () => {
		expect(Object.keys(HTML_LANG).sort()).toEqual(['en', 'ja', 'mw', 'tw', 'zh']);
	});
});

describe('localizedPath', () => {
	it('returns the clean pathname for the base locale', () => {
		// baseLocale = 'mw'
		expect(localizedPath('/settings', 'mw')).toBe('/settings');
	});

	it('appends ?lang=<locale> for non-base locales', () => {
		expect(localizedPath('/settings', 'en')).toBe('/settings?lang=en');
		expect(localizedPath('/', 'ja')).toBe('/?lang=ja');
	});
});

describe('canonicalPath', () => {
	it('preserves ?lang when present', () => {
		const url = new URL('https://example.com/settings?lang=en');
		expect(canonicalPath(url)).toBe('/settings?lang=en');
	});

	it('drops all query params when ?lang is absent', () => {
		const url = new URL('https://example.com/feed?utm_source=x&ref=y');
		expect(canonicalPath(url)).toBe('/feed');
	});

	it('drops non-lang params but keeps ?lang', () => {
		const url = new URL('https://example.com/settings?lang=ja&debug=1');
		expect(canonicalPath(url)).toBe('/settings?lang=ja');
	});

	it('returns bare pathname when neither ?lang nor other params exist', () => {
		const url = new URL('https://example.com/');
		expect(canonicalPath(url)).toBe('/');
	});
});
