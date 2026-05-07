import { describe, expect, it } from 'vitest';
import { DEFAULT_HOSTS } from '$lib/cdn/hosts';
import {
	CODE_FONT_IDS,
	LOADABLE_CODE_FONT_IDS,
	isCodeFont,
	linksFor,
	renderCodeLinks
} from '$lib/font/code-data';

describe('isCodeFont', () => {
	it('accepts every id', () => {
		for (const id of CODE_FONT_IDS) expect(isCodeFont(id)).toBe(true);
	});

	it('rejects unknown values', () => {
		expect(isCodeFont('mono')).toBe(false);
		expect(isCodeFont(0)).toBe(false);
	});
});

describe('LOADABLE_CODE_FONT_IDS', () => {
	it('excludes the CSS generic `monospace`', () => {
		expect(LOADABLE_CODE_FONT_IDS).not.toContain('monospace');
	});
});

describe('linksFor', () => {
	it('returns [] for monospace (zero network)', () => {
		expect(linksFor('monospace', DEFAULT_HOSTS)).toEqual([]);
	});

	it('maple splits into two Fontsource stylesheets per weight bucket', () => {
		const urls = linksFor('maple', DEFAULT_HOSTS);
		expect(urls).toHaveLength(2);
		expect(urls[0]).toContain('latin-400.css');
		expect(urls[1]).toContain('latin-700.css');
		expect(urls.every((u) => u.startsWith('https://cdn.jsdelivr.net/npm/'))).toBe(true);
	});

	it('jetbrains and fira each emit one Google Fonts CSS URL with both weights', () => {
		expect(linksFor('jetbrains', DEFAULT_HOSTS)[0]).toBe(
			'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap'
		);
		expect(linksFor('fira', DEFAULT_HOSTS)[0]).toBe(
			'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap'
		);
	});
});

describe('renderCodeLinks — orchestration', () => {
	it('returns empty for monospace outside /settings', () => {
		expect(renderCodeLinks('monospace', false, DEFAULT_HOSTS)).toBe('');
	});

	it('/settings preloads every loadable choice even when current is monospace', () => {
		const out = renderCodeLinks('monospace', true, DEFAULT_HOSTS);
		for (const choice of LOADABLE_CODE_FONT_IDS) {
			// Each choice contributes at least one URL so the preload is honoured.
			const expected = linksFor(choice, DEFAULT_HOSTS)[0];
			expect(out).toContain(expected);
		}
	});

	it('emits preconnect for the package CDN only when maple is included', () => {
		const jetOnly = renderCodeLinks('jetbrains', false, DEFAULT_HOSTS);
		expect(jetOnly).not.toContain('rel="preconnect" href="https://cdn.jsdelivr.net"');
		const mapleOnly = renderCodeLinks('maple', false, DEFAULT_HOSTS);
		expect(mapleOnly).toContain('rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin');
	});

	it('emits Google Fonts preconnect pair when a Google face is included', () => {
		const out = renderCodeLinks('fira', false, DEFAULT_HOSTS);
		expect(out).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
		expect(out).toContain('rel="preconnect" href="https://fonts.gstatic.com" crossorigin');
	});

	it('tags stylesheets with data-code-link', () => {
		const out = renderCodeLinks('fira', false, DEFAULT_HOSTS);
		expect(out).toContain('data-code-link');
	});
});
