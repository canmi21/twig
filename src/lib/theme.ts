type ResolvedTheme = 'light' | 'dark'
export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_COOKIE_KEY = 'theme'
const THEME_MAX_AGE = 60 * 60 * 24 * 400

export function setThemeCookie(preference: ThemePreference) {
	document.cookie = `${THEME_COOKIE_KEY}=${preference};path=/;max-age=${THEME_MAX_AGE};samesite=lax`
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
	if (preference === 'light' || preference === 'dark') return preference
	return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
	document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/**
 * Blocking script injected into <head> to prevent FOUC.
 *
 * Resolve chain:
 *   cookie = light | dark → apply directly
 *   cookie = system | absent → matchMedia resolve → apply
 *
 * Does NOT write a cookie for first-time visitors (server sets default on first request).
 */
export const THEME_INIT_SCRIPT = [
	'(function(){',
	'var m=document.cookie.match(/\\btheme=(light|dark|system)\\b/);',
	'var p=m?m[1]:"system";',
	'var t=p==="light"||p==="dark"?p:window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";',
	'if(t==="dark")document.documentElement.classList.add("dark");',
	'if(!m)document.cookie="theme=system;path=/;max-age=34560000;samesite=lax";',
	'})()',
].join('')
