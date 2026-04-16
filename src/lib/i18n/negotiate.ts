import type { Locale } from '$lib/paraglide/runtime';

// Replaces or appends a name=value pair in a cookie header string.
export function upsertCookie(cookieHeader: string, name: string, value: string): string {
	const pattern = new RegExp(`(^|; *)${name}=[^;]*`);
	if (pattern.test(cookieHeader)) {
		return cookieHeader.replace(pattern, `$1${name}=${value}`);
	}
	return cookieHeader ? `${cookieHeader}; ${name}=${value}` : `${name}=${value}`;
}

// Checks whether a `language=` cookie is present in the header.
export function hasLangCookie(cookieHeader: string | null): boolean {
	return /(?:^|; *)language=/.test(cookieHeader ?? '');
}

// Explicit Accept-Language -> locale mapping. Intentionally curated so that
// zh-TW / zh-HK / zh-MO / zh-Hant land on `tw` (Traditional), zh-CN etc.
// land on `zh` (Simplified), and anything unrecognised falls back to `en`.
// `mw` is never selected automatically — it's only reachable by explicit
// `?lang=mw` or a manual cookie write from the language switcher.
export function resolveLocaleFromAcceptLanguage(header: string | null): Locale {
	if (!header) return 'en';
	const langs = header
		.split(',')
		.map((lang) => {
			const [tag, q = '1'] = lang.trim().split(';q=');
			return { tag: tag.toLowerCase(), q: Number.parseFloat(q) };
		})
		.sort((a, b) => b.q - a.q);

	for (const { tag } of langs) {
		if (tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-mo' || tag.startsWith('zh-hant')) {
			return 'tw';
		}
		if (tag === 'zh' || tag.startsWith('zh-')) return 'zh';
		if (tag === 'en' || tag.startsWith('en-')) return 'en';
		if (tag === 'ja' || tag.startsWith('ja-')) return 'ja';
	}
	return 'en';
}
