import { baseLocale } from '$lib/paraglide/runtime';

// Paraglide locale → BCP47 for <html lang>. `mw` maps to `zh` (majority Chinese).
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

// Base locale → clean path; others → path?lang=<locale> for crawler visibility.
export function localizedPath(pathname: string, locale: string): string {
	return locale === baseLocale ? pathname : `${pathname}?lang=${locale}`;
}

// Strips all query params except ?lang — hreflang URLs must self-canonicalize.
export function canonicalPath(url: URL): string {
	const lang = url.searchParams.get('lang');
	return lang ? `${url.pathname}?lang=${lang}` : url.pathname;
}
