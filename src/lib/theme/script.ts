export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'theme';
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

// Synchronous inline script injected into <head> before any stylesheet.
// Reads the theme cookie; if absent, detects system preference and writes the cookie.
// Sets .dark class on <html>; color-scheme is handled by CSS.
export const themeScript = `(function(){var m=document.cookie.match(/\\btheme=(light|dark)\\b/);var t=m?m[1]:window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";if(t==="dark")document.documentElement.classList.add("dark");if(!m)document.cookie="theme="+t+";path=/;max-age=31536000;SameSite=Lax"})()`;

export function setThemeCookie(theme: Theme): void {
	document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=${THEME_MAX_AGE};SameSite=Lax`;
}
