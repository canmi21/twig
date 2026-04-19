import { afterEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_HOSTS,
	getClientCdnHosts,
	resolveCdnHosts,
	setClientCdnHosts,
	type CdnHosts
} from '$lib/cdn/hosts';

describe('resolveCdnHosts', () => {
	it('returns defaults when country is undefined (dev / prerender)', () => {
		expect(resolveCdnHosts(undefined)).toBe(DEFAULT_HOSTS);
	});

	it('returns defaults for a non-blocked country (US)', () => {
		expect(resolveCdnHosts('US')).toBe(DEFAULT_HOSTS);
	});

	it('uses loli.net + fastly.jsdelivr for CN (both block lists hit)', () => {
		expect(resolveCdnHosts('CN')).toEqual({
			fontsCss: 'fonts.loli.net',
			fontsStatic: 'gstatic.loli.net',
			packageCdn: 'fastly.jsdelivr.net'
		});
	});

	it('uses loli.net for IR but keeps default package CDN', () => {
		expect(resolveCdnHosts('IR')).toEqual({
			fontsCss: 'fonts.loli.net',
			fontsStatic: 'gstatic.loli.net',
			packageCdn: DEFAULT_HOSTS.packageCdn
		});
	});

	it('uses loli.net for RU but keeps default package CDN', () => {
		expect(resolveCdnHosts('RU')).toEqual({
			fontsCss: 'fonts.loli.net',
			fontsStatic: 'gstatic.loli.net',
			packageCdn: DEFAULT_HOSTS.packageCdn
		});
	});

	it('is case-insensitive on the country code', () => {
		expect(resolveCdnHosts('cn')).toEqual(resolveCdnHosts('CN'));
	});
});

describe('client CDN host accessor', () => {
	const original = getClientCdnHosts();
	afterEach(() => setClientCdnHosts(original));

	it('defaults to DEFAULT_HOSTS before any override', () => {
		expect(getClientCdnHosts()).toBe(DEFAULT_HOSTS);
	});

	it('round-trips set → get', () => {
		const next: CdnHosts = {
			fontsCss: 'a.example',
			fontsStatic: 'b.example',
			packageCdn: 'c.example'
		};
		setClientCdnHosts(next);
		expect(getClientCdnHosts()).toBe(next);
	});
});
