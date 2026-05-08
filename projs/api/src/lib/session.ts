import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

const COOKIE_NAME = 'session';
// 30 days. Keep in sync with the JWT exp set in signSessionJwt().
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// No Domain attribute — let the browser scope to whatever host served the
// response. With Vercel rewrites proxying canmi.app/api/auth/* into the api
// Worker, the browser sees canmi.app as the origin and scopes accordingly.
export function setSessionCookie(c: Context, token: string) {
	setCookie(c, COOKIE_NAME, token, {
		httpOnly: true,
		secure: true,
		sameSite: 'Lax',
		path: '/',
		maxAge: MAX_AGE_SECONDS
	});
}

export function getSessionCookie(c: Context): string | undefined {
	return getCookie(c, COOKIE_NAME);
}

export function clearSessionCookie(c: Context) {
	deleteCookie(c, COOKIE_NAME, { path: '/' });
}

export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
