import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = () => {
	const body = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /@/
Disallow: /cgi-bin/
Disallow: /cdn-cgi/

Sitemap: ${__PUBLIC_URL__}/sitemap.xml
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400, s-maxage=86400'
		}
	});
};
