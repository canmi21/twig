export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'theme';
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

// Inline <head> IIFE: reads theme cookie → falls back to system preference →
// sets .dark on <html> and persists the cookie. Runs before first paint.
export const themeScript = `(function(){var m=document.cookie.match(/\\btheme=(light|dark)\\b/);var t=m?m[1]:window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";if(t==="dark")document.documentElement.classList.add("dark");if(!m)document.cookie="theme="+t+";path=/;max-age=31536000;SameSite=Lax"})()`;

export function setThemeCookie(theme: Theme): void {
	document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=${THEME_MAX_AGE};SameSite=Lax`;
}

// Swap theme without tweening the color-variable change. Injects a transition
// suppressor before flipping .dark, then removes it after the paint so hover
// transitions elsewhere keep working.
export function applyTheme(theme: Theme): void {
	const root = document.documentElement;

	const suppressor = document.createElement('style');
	suppressor.textContent = `*,*::before,*::after{transition:none !important;}`;
	document.head.appendChild(suppressor);

	root.classList.toggle('dark', theme === 'dark');
	setThemeCookie(theme);

	// Force a synchronous style flush so the color swap commits under the
	// suppressor, then remove it on the next tick (next-themes pattern).
	void getComputedStyle(root).backgroundColor;
	setTimeout(() => suppressor.remove(), 1);
}
