/* src/lib/timezone.ts */

const TZ_COOKIE_KEY = 'timezone'
const TZ_MAX_AGE = 60 * 60 * 24 * 400

/**
 * Blocking script injected into <head> to persist the client timezone.
 *
 * On first visit the cookie is absent, so the server renders dates in UTC.
 * This script writes the cookie immediately so that subsequent requests
 * carry the timezone header and the server can render locale-correct dates.
 */
export const TIMEZONE_INIT_SCRIPT = [
	'(function(){',
	String.raw`if(!document.cookie.match(/\btimezone=/)){`,
	'var tz=Intl.DateTimeFormat().resolvedOptions().timeZone;',
	`document.cookie="${TZ_COOKIE_KEY}="+tz+";path=/;max-age=${TZ_MAX_AGE};samesite=lax";`,
	'}',
	'})()',
].join('')
