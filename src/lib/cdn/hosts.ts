export type CdnHosts = {
	fontsCss: string;
	fontsStatic: string;
	packageCdn: string;
};

export const DEFAULT_HOSTS: CdnHosts = {
	fontsCss: 'fonts.googleapis.com',
	fontsStatic: 'fonts.gstatic.com',
	packageCdn: 'cdn.jsdelivr.net'
};

// fonts.loli.net proxies Google Fonts end-to-end: the CSS endpoint matches
// /css2 path + params, and `src: url(...)` inside gets rewritten to
// gstatic.loli.net — both hosts need their own preconnect hint.
const LOLI_CSS = 'fonts.loli.net';
const LOLI_STATIC = 'gstatic.loli.net';

// jsDelivr's ICP license was revoked Dec 2021 and CN reachability has been
// flaky since. fastly.jsdelivr.net is their undocumented provider-pinned
// origin — same tree, same URLs, same CORS — currently bypasses the GFW
// block on the apex host. No guarantee it stays that way.
const FASTLY_JSDELIVR = 'fastly.jsdelivr.net';

const FONTS_CDN_BLOCKED = new Set(['CN', 'IR', 'RU']);
const PACKAGE_CDN_BLOCKED = new Set(['CN']);

export function resolveCdnHosts(country: string | undefined): CdnHosts {
	const cc = country?.toUpperCase();
	if (!cc) return DEFAULT_HOSTS;
	const fontsCdnBlocked = FONTS_CDN_BLOCKED.has(cc);
	const packageCdnBlocked = PACKAGE_CDN_BLOCKED.has(cc);
	if (!fontsCdnBlocked && !packageCdnBlocked) return DEFAULT_HOSTS;
	return {
		fontsCss: fontsCdnBlocked ? LOLI_CSS : DEFAULT_HOSTS.fontsCss,
		fontsStatic: fontsCdnBlocked ? LOLI_STATIC : DEFAULT_HOSTS.fontsStatic,
		packageCdn: packageCdnBlocked ? FASTLY_JSDELIVR : DEFAULT_HOSTS.packageCdn
	};
}

// Client-side hosts are seeded once per navigation from page.data.cdn by
// +layout.svelte. Runtime font-injection helpers read through this so that
// soft-navigations in blocked regions keep using the mirror rather than
// reverting to hard-coded Google / jsDelivr origins.
let clientHosts: CdnHosts = DEFAULT_HOSTS;

export function setClientCdnHosts(hosts: CdnHosts): void {
	clientHosts = hosts;
}

export function getClientCdnHosts(): CdnHosts {
	return clientHosts;
}
