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

// fastly.jsdelivr.net is an undocumented provider-pinned origin — same tree,
// same CORS — currently bypasses the GFW block on the apex host. No guarantees.
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

// Seeded from page.data.cdn so soft-navigations in blocked regions keep
// using the mirror instead of reverting to hard-coded origins.
let clientHosts: CdnHosts = DEFAULT_HOSTS;

export function setClientCdnHosts(hosts: CdnHosts): void {
	clientHosts = hosts;
}

export function getClientCdnHosts(): CdnHosts {
	return clientHosts;
}
