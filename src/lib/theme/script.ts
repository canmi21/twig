export type Mode = 'light' | 'dark';
export type Palette = 'neutral' | 'nord' | 'contrast';
export type ThemeState = { mode: Mode; palette: Palette };

export const MODE_COOKIE = 'theme';
export const PALETTE_COOKIE = 'palette';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const PALETTE_CLASSES: readonly Exclude<Palette, 'neutral'>[] = ['nord', 'contrast'];

// Inline <head> IIFE: reads theme + palette cookies → falls back to system preference
// for mode → sets .dark / .nord / .contrast on <html> and persists the mode cookie.
// Runs before first paint. `neutral` palette is the absence of .nord and .contrast.
export const themeScript = `(function(){var mm=document.cookie.match(/\\btheme=(light|dark)\\b/);var pm=document.cookie.match(/\\bpalette=(nord|contrast)\\b/);var m=mm?mm[1]:window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";var h=document.documentElement;if(m==="dark")h.classList.add("dark");if(pm)h.classList.add(pm[1]);if(!mm)document.cookie="theme="+m+";path=/;max-age=31536000;SameSite=Lax"})()`;

export function setModeCookie(mode: Mode): void {
	document.cookie = `${MODE_COOKIE}=${mode};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

export function setPaletteCookie(palette: Palette): void {
	if (palette === 'neutral') {
		document.cookie = `${PALETTE_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
	} else {
		document.cookie = `${PALETTE_COOKIE}=${palette};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
	}
}

// Swap theme without tweening the color-variable change. Injects a transition
// suppressor before flipping classes, then removes it after the paint so hover
// transitions elsewhere keep working. Either axis can be changed independently.
export function applyTheme(next: { mode?: Mode; palette?: Palette }): void {
	const root = document.documentElement;

	const suppressor = document.createElement('style');
	suppressor.textContent = `*,*::before,*::after{transition:none !important;}`;
	document.head.appendChild(suppressor);

	if (next.mode !== undefined) {
		root.classList.toggle('dark', next.mode === 'dark');
		setModeCookie(next.mode);
	}
	if (next.palette !== undefined) {
		for (const p of PALETTE_CLASSES) {
			root.classList.toggle(p, p === next.palette);
		}
		setPaletteCookie(next.palette);
	}

	// Force a synchronous style flush so the color swap commits under the
	// suppressor, then remove it on the next tick (next-themes pattern).
	void getComputedStyle(root).backgroundColor;
	setTimeout(() => suppressor.remove(), 1);
}
