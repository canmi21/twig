import { describe, expect, it } from 'vitest';
import { DEFAULT_HOSTS, type CdnHosts } from '$lib/cdn/hosts';
import {
	FONTS,
	FONT_IDS,
	LOADABLE_FONT_IDS,
	buildFontsHref,
	isFontFamily,
	renderFontLinks,
	type FontFamily
} from '$lib/font/data';

const MIRROR: CdnHosts = {
	fontsCss: 'fonts.loli.net',
	fontsStatic: 'gstatic.loli.net',
	packageCdn: 'fastly.jsdelivr.net'
};

describe('FONT_IDS / LOADABLE_FONT_IDS', () => {
	it('LOADABLE_FONT_IDS excludes `system` and matches FONTS[id].remoteFamily !== null', () => {
		expect(LOADABLE_FONT_IDS).not.toContain('system');
		for (const id of LOADABLE_FONT_IDS) {
			expect(FONTS[id].remoteFamily).not.toBeNull();
		}
	});

	it('FONT_IDS covers every FONTS key', () => {
		expect(new Set(FONT_IDS)).toEqual(new Set(Object.keys(FONTS)));
	});
});

describe('isFontFamily', () => {
	it('accepts every known id', () => {
		for (const id of FONT_IDS) expect(isFontFamily(id)).toBe(true);
	});

	it('rejects an unknown string', () => {
		expect(isFontFamily('comic-sans')).toBe(false);
	});

	it('rejects non-string input', () => {
		expect(isFontFamily(undefined)).toBe(false);
		expect(isFontFamily(null)).toBe(false);
		expect(isFontFamily(42)).toBe(false);
	});
});

describe('buildFontsHref', () => {
	it('returns null when no loadable families are requested', () => {
		expect(buildFontsHref(['system'], DEFAULT_HOSTS)).toBeNull();
		expect(buildFontsHref([], DEFAULT_HOSTS)).toBeNull();
	});

	it('builds a single-family href against the default CSS host', () => {
		const href = buildFontsHref(['inter'], DEFAULT_HOSTS);
		expect(href).toBe(
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
		);
	});

	it('swaps to the mirror host for blocked regions', () => {
		const href = buildFontsHref(['inter'], MIRROR);
		expect(href?.startsWith('https://fonts.loli.net/css2?')).toBe(true);
	});

	it('collapses multiple families into one request joined by &', () => {
		const href = buildFontsHref(['inter', 'roboto'], DEFAULT_HOSTS);
		expect(href).toContain('family=Inter:wght@400;500;600;700');
		expect(href).toContain('family=Roboto:wght@400;500;600;700');
		expect(href?.endsWith('&display=swap')).toBe(true);
	});

	it('encodes spaces as + per the Google Fonts CSS spec', () => {
		const href = buildFontsHref(['source-sans'], DEFAULT_HOSTS);
		expect(href).toContain('family=Source+Sans+3:wght@400;500;600;700');
		expect(href).not.toContain('%20');
	});

	it('skips families that are not loadable but still honours loadable ones', () => {
		const href = buildFontsHref(['system', 'inter'] as FontFamily[], DEFAULT_HOSTS);
		expect(href).toContain('family=Inter');
	});
});

describe('renderFontLinks', () => {
	it('returns an empty string when there is nothing to load', () => {
		expect(renderFontLinks(['system'], DEFAULT_HOSTS)).toBe('');
	});

	it('emits preconnect + stylesheet tags tagged with data-font-ids', () => {
		const out = renderFontLinks(['inter', 'roboto'], DEFAULT_HOSTS);
		expect(out).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
		expect(out).toContain('rel="preconnect" href="https://fonts.gstatic.com" crossorigin');
		expect(out).toContain('rel="stylesheet"');
		expect(out).toContain('data-font-ids="inter roboto"');
	});

	it('does not list `system` in data-font-ids', () => {
		const out = renderFontLinks(['system', 'inter'] as FontFamily[], DEFAULT_HOSTS);
		expect(out).toContain('data-font-ids="inter"');
	});
});
