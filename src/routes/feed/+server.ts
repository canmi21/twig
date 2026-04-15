import { generateAtomFeed } from 'feedsmith';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ platform }) => {
	const baseUrl = platform?.env.PUBLIC_URL ?? 'https://canmi.net';
	const now = new Date();
	const year = now.getFullYear();

	// Round `updated` down to the current hour so feed readers don't see a fresh
	// timestamp on every request and trigger spurious "updated" notifications.
	const updated = new Date(now);
	updated.setMinutes(0, 0, 0);

	const xml = generateAtomFeed({
		id: `${baseUrl}/feed`,
		title: 'Canmi',
		subtitle: 'A placeholder subtitle — fill me in',
		updated,
		authors: [{ name: 'Canmi', email: 't@canmi.icu', uri: baseUrl }],
		links: [
			{ href: baseUrl, rel: 'alternate', type: 'text/html' },
			{ href: `${baseUrl}/feed`, rel: 'self', type: 'application/atom+xml' }
		],
		icon: `${baseUrl}/favicon.svg`,
		rights: `© ${year} Canmi`,
		generator: { text: 'feedsmith' },
		categories: [{ term: 'tech' }, { term: 'life' }],
		entries: []
	});

	// Feedsmith doesn't surface xml:lang as a top-level option, so inject it
	// into the root <feed> element by hand.
	const xmlWithLang = xml.replace('<feed xmlns=', '<feed xml:lang="en" xmlns=');

	return new Response(xmlWithLang, {
		headers: {
			'Content-Type': 'application/atom+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=360, s-maxage=360'
		}
	});
};
