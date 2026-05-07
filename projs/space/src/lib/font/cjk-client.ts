import { getClientCdnHosts } from '$lib/cdn/hosts';
import {
	CJK_FONT_COOKIE,
	COOKIE_MAX_AGE,
	langsForHtmlLang,
	linksFor,
	type CjkFont
} from './cjk-data';

export function setCjkFontCookie(cjk: CjkFont): void {
	document.cookie = `${CJK_FONT_COOKIE}=${cjk};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

const loadedRuntime = new Set<string>();

function hasLinkInDom(href: string): boolean {
	return document.head.querySelector(`link[href="${href}"]`) !== null;
}

function injectLinks(urls: string[]): void {
	for (const url of urls) {
		if (loadedRuntime.has(url) || hasLinkInDom(url)) {
			loadedRuntime.add(url);
			continue;
		}
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = url;
		link.dataset.cjkLink = '';
		document.head.appendChild(link);
		loadedRuntime.add(url);
	}
}

export function ensureCjkLoadedForPage(cjk: CjkFont): void {
	const langs = langsForHtmlLang(document.documentElement.lang);
	injectLinks(linksFor(cjk, langs, getClientCdnHosts()));
}

export function ensureAllCjkLoaded(): void {
	const langs = langsForHtmlLang(document.documentElement.lang);
	const hosts = getClientCdnHosts();
	for (const cjk of ['noto', 'lxgw'] as const) {
		injectLinks(linksFor(cjk, langs, hosts));
	}
}

export function applyCjkFont(cjk: CjkFont): void {
	ensureCjkLoadedForPage(cjk);
	setCjkFontCookie(cjk);
	document.documentElement.dataset.cjk = cjk;
}
