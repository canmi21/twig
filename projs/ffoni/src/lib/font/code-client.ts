import { getClientCdnHosts } from '$lib/cdn/hosts';
import {
	CODE_FONT_COOKIE,
	COOKIE_MAX_AGE,
	LOADABLE_CODE_FONT_IDS,
	linksFor,
	type CodeFont
} from './code-data';

export function setCodeFontCookie(code: CodeFont): void {
	document.cookie = `${CODE_FONT_COOKIE}=${code};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
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
		link.dataset.codeLink = '';
		document.head.appendChild(link);
		loadedRuntime.add(url);
	}
}

export function ensureCodeLoadedForPage(code: CodeFont): void {
	injectLinks(linksFor(code, getClientCdnHosts()));
}

export function ensureAllCodeLoaded(): void {
	const hosts = getClientCdnHosts();
	for (const code of LOADABLE_CODE_FONT_IDS) {
		injectLinks(linksFor(code, hosts));
	}
}

export function applyCodeFont(code: CodeFont): void {
	ensureCodeLoadedForPage(code);
	setCodeFontCookie(code);
	document.documentElement.dataset.codeFont = code;
}
