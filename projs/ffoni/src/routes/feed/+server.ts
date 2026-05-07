import { generateAtomFeed } from 'feedsmith';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = () => {
	const now = new Date();
	const year = now.getFullYear();

	// Round to current hour to avoid spurious "updated" pings in feed readers.
	const updated = new Date(now);
	updated.setMinutes(0, 0, 0);

	const xml = generateAtomFeed({
		id: `${__PUBLIC_URL__}/feed`,
		title: 'Canmi',
		subtitle: 'A placeholder subtitle — fill me in',
		updated,
		authors: [{ name: 'Canmi', email: 't@canmi.icu', uri: __PUBLIC_URL__ }],
		links: [
			{ href: __PUBLIC_URL__, rel: 'alternate', type: 'text/html' },
			{ href: `${__PUBLIC_URL__}/feed`, rel: 'self', type: 'application/atom+xml' }
		],
		icon: `${__PUBLIC_URL__}/favicon.svg`,
		rights: `© ${year} Canmi`,
		generator: { text: 'feedsmith' },
		categories: [{ term: 'tech' }, { term: 'life' }],
		entries: []
	});

	// Feedsmith lacks xml:lang support; inject by hand.
	const xmlWithLang = xml.replace('<feed xmlns=', '<feed xml:lang="en" xmlns=');

	return new Response(xmlWithLang, {
		headers: {
			'Content-Type': 'application/atom+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=360, s-maxage=360'
		}
	});
};
