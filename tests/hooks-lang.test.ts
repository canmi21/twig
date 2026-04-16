import { describe, expect, it } from 'vitest';

const BASE = 'http://localhost:23315';

describe('?lang= query parameter', () => {
	it('redirects 302 with Set-Cookie when lang is valid', async () => {
		const res = await fetch(`${BASE}/?lang=tw`, { redirect: 'manual' });

		expect(res.status).toBe(302);

		const location = res.headers.get('location');
		expect(location).toBe('/');

		const setCookie = res.headers.get('set-cookie');
		expect(setCookie).toContain('language=tw');
		expect(setCookie?.toLowerCase()).not.toContain('httponly');
	});

	it('preserves other query params when stripping lang', async () => {
		const res = await fetch(`${BASE}/?lang=zh&ref=share`, { redirect: 'manual' });

		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('/?ref=share');
		expect(res.headers.get('set-cookie')).toContain('language=zh');
	});

	it('ignores invalid lang values and serves page normally', async () => {
		const res = await fetch(`${BASE}/?lang=xx`);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/html');
	});

	it('serves page without redirect when lang is absent', async () => {
		const res = await fetch(`${BASE}/`);

		expect(res.status).toBe(200);
	});
});
