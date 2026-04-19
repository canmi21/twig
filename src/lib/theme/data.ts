export type Mode = 'light' | 'dark';
export type Palette = 'neutral' | 'nord' | 'contrast';
export type ThemeState = { mode: Mode; palette: Palette };

export const MODE_COOKIE = 'theme';
export const PALETTE_COOKIE = 'palette';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const PALETTE_CLASSES: readonly Exclude<Palette, 'neutral'>[] = ['nord', 'contrast'];

// Inline <head> IIFE: reads theme + palette cookies → falls back to system preference
// for mode → sets .dark / .nord / .contrast on <html> and persists the mode cookie.
// Runs before first paint. `neutral` palette is the absence of .nord and .contrast.
export const themeScript = `(function(){var mm=document.cookie.match(/\\btheme=(light|dark)\\b/);var pm=document.cookie.match(/\\bpalette=(nord|contrast)\\b/);var m=mm?mm[1]:window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";var h=document.documentElement;if(m==="dark")h.classList.add("dark");if(pm)h.classList.add(pm[1]);if(!mm)document.cookie="theme="+m+";path=/;max-age=31536000;SameSite=Lax"})()`;
