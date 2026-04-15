import { baseLocale } from '$lib/paraglide/runtime';

// Maps a Paraglide locale ID to the BCP47 tag used in the <html lang> attribute.
// `mw` is the informal mixed-language default; we tag it as plain `zh` since the
// majority content is Chinese and no standard code describes the mix.
export const HTML_LANG: Record<string, string> = {
	mw: 'zh',
	en: 'en-US',
	zh: 'zh-CN',
	tw: 'zh-TW',
	ja: 'ja-JP'
};

export function htmlLangFor(locale: string): string {
	return HTML_LANG[locale] ?? locale;
}

// Returns the path (with optional `?lang=` query) that serves the given locale.
// Default locale lives at the clean path; non-default locales are addressed
// with a `?lang=<locale>` query so they have distinct crawler-visible URLs.
export function localizedPath(pathname: string, locale: string): string {
	return locale === baseLocale ? pathname : `${pathname}?lang=${locale}`;
}

// Returns the canonical path for a URL — same URL the visitor sees, but
// stripped of any query params that aren't the locale override. Every
// hreflang-linked URL must self-canonical, otherwise Google ignores the group.
export function canonicalPath(url: URL): string {
	const lang = url.searchParams.get('lang');
	return lang ? `${url.pathname}?lang=${lang}` : url.pathname;
}
