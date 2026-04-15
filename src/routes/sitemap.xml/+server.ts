import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ platform }) => {
	const baseUrl = platform?.env.PUBLIC_URL ?? 'https://canmi.net';

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<url>
		<loc>${baseUrl}/</loc>
		<changefreq>daily</changefreq>
		<priority>1.0</priority>
	</url>
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=360, s-maxage=360'
		}
	});
};
