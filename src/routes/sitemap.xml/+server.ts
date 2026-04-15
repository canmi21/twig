import { baseLocale, locales } from '$lib/paraglide/runtime';
import { htmlLangFor, localizedPath } from '$lib/i18n/urls';
import type { RequestHandler } from './$types';

export const prerender = true;

// Every public page that should appear in the sitemap.
const ROUTES = ['/'];

function hreflangLinks(pathname: string): string {
	const perLocale = locales
		.filter((l) => l !== baseLocale)
		.map(
			(l) =>
				`\t\t<xhtml:link rel="alternate" hreflang="${htmlLangFor(l)}" href="${__PUBLIC_URL__}${localizedPath(pathname, l)}"/>`
		)
		.join('\n');
	const xDefault = `\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${__PUBLIC_URL__}${localizedPath(pathname, baseLocale)}"/>`;
	return `${perLocale}\n${xDefault}`;
}

function urlEntry(pathname: string, locale: string): string {
	return `\t<url>
\t\t<loc>${__PUBLIC_URL__}${localizedPath(pathname, locale)}</loc>
\t\t<changefreq>daily</changefreq>
\t\t<priority>1.0</priority>
${hreflangLinks(pathname)}
\t</url>`;
}

export const GET: RequestHandler = () => {
	const entries = ROUTES.flatMap((path) => locales.map((locale) => urlEntry(path, locale))).join(
		'\n'
	);

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/xml.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=360, s-maxage=360'
		}
	});
};
