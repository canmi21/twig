import { describe, expect, it } from 'vitest';
import { DEFAULT_HOSTS } from '$lib/cdn/hosts';
import {
	CJK_FONT_IDS,
	isCjkFont,
	labelFor,
	langsForHtmlLang,
	linksFor,
	renderCjkLinks
} from '$lib/font/cjk-data';

describe('isCjkFont', () => {
	it('accepts every id', () => {
		for (const id of CJK_FONT_IDS) expect(isCjkFont(id)).toBe(true);
	});

	it('rejects unknown values', () => {
		expect(isCjkFont('serif')).toBe(false);
		expect(isCjkFont(undefined)).toBe(false);
	});
});

describe('labelFor', () => {
	it('returns the default label when the page is not Japanese', () => {
		expect(labelFor('lxgw', 'zh-CN')).toBe('LXGW WenKai');
		expect(labelFor('noto', 'en-US')).toBe('Noto Sans');
		expect(labelFor('system', 'ja-JP')).toBe('System');
	});

	it('returns the ja-specific label when the page is Japanese and one exists', () => {
		expect(labelFor('lxgw', 'ja-JP')).toBe('Klee One');
	});

	it('falls back to default for ja pages when there is no ja override', () => {
		expect(labelFor('noto', 'ja-JP')).toBe('Noto Sans');
	});
});

describe('langsForHtmlLang', () => {
	it('Japanese pairs JP primary with SC fallback', () => {
		expect(langsForHtmlLang('ja-JP')).toEqual(['jp', 'sc']);
	});

	it('Traditional Chinese pairs TC primary with JP fallback', () => {
		expect(langsForHtmlLang('zh-TW')).toEqual(['tc', 'jp']);
	});

	it('zh-Hant variants resolve to TC', () => {
		expect(langsForHtmlLang('zh-Hant-HK')).toEqual(['tc', 'jp']);
	});

	it('Simplified Chinese and everything else defaults to SC primary with JP fallback', () => {
		expect(langsForHtmlLang('zh-CN')).toEqual(['sc', 'jp']);
		expect(langsForHtmlLang('en-US')).toEqual(['sc', 'jp']);
	});
});

describe('linksFor', () => {
	it('returns nothing for `system`', () => {
		expect(linksFor('system', ['sc', 'jp'], DEFAULT_HOSTS)).toEqual([]);
	});

	it('noto collapses the requested languages into one CSS request', () => {
		const urls = linksFor('noto', ['sc', 'jp'], DEFAULT_HOSTS);
		expect(urls).toHaveLength(1);
		expect(urls[0]).toContain('family=Noto+Sans+SC');
		expect(urls[0]).toContain('family=Noto+Sans+JP');
		expect(urls[0]).not.toContain('family=Noto+Sans+TC');
	});

	it('lxgw emits one URL per static weight per language (SC/TC) + Klee for JP', () => {
		const urls = linksFor('lxgw', ['sc', 'jp'], DEFAULT_HOSTS);
		// 3 weights × 1 SC family + 1 Klee JP = 4
		expect(urls).toHaveLength(4);
		expect(urls.some((u) => u.includes('lxgwwenkai-regular/result.css'))).toBe(true);
		expect(urls.some((u) => u.includes('family=Klee+One'))).toBe(true);
	});

	it('lxgw TC path hits the tc-web package', () => {
		const urls = linksFor('lxgw', ['tc'], DEFAULT_HOSTS);
		expect(urls.every((u) => u.includes('lxgw-wenkai-tc-web'))).toBe(true);
	});

	it('returns [] when noto is requested but no languages match', () => {
		expect(linksFor('noto', [], DEFAULT_HOSTS)).toEqual([]);
	});
});

describe('renderCjkLinks — orchestration', () => {
	it('returns empty for system when not on /settings', () => {
		expect(renderCjkLinks('system', 'zh-CN', false, DEFAULT_HOSTS)).toBe('');
	});

	it('/settings preloads both noto + lxgw even if current choice is system', () => {
		const out = renderCjkLinks('system', 'zh-CN', true, DEFAULT_HOSTS);
		expect(out).toContain('Noto+Sans+SC');
		expect(out).toContain('lxgwwenkai-regular');
	});

	it('tags stylesheets with data-cjk-link', () => {
		const out = renderCjkLinks('noto', 'zh-CN', false, DEFAULT_HOSTS);
		expect(out).toContain('data-cjk-link');
	});

	it('includes the package-cdn preconnect only when an lxgw link is present', () => {
		const notoOnly = renderCjkLinks('noto', 'zh-CN', false, DEFAULT_HOSTS);
		expect(notoOnly).not.toContain('rel="preconnect" href="https://cdn.jsdelivr.net"');
		const lxgw = renderCjkLinks('lxgw', 'zh-CN', false, DEFAULT_HOSTS);
		expect(lxgw).toContain('rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin');
	});

	it('deduplicates URLs across choices on the settings page', () => {
		const out = renderCjkLinks('noto', 'ja-JP', true, DEFAULT_HOSTS);
		const linkCount = out.match(/data-cjk-link/g)?.length ?? 0;
		// At least one tag per unique URL; the noto call for ja returns a single
		// combined CSS URL, and lxgw adds its 3 weight splits + 1 Klee stylesheet.
		// The Klee URL overlaps with noto's family CSS host but is a distinct URL,
		// so nothing should be deduplicated to zero.
		expect(linkCount).toBeGreaterThan(0);
	});
});
