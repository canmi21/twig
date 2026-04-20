import type { Mode, Palette } from './data';

export type PaletteColors = {
	bg: string;
	titlebar: string;
	dot: string;
	sidebar: string;
	title: string;
	body: string;
	border: string;
	borderHover: string;
};

export type ThemeOption = {
	palette: Palette;
	mode: Mode;
	// Paraglide message key. Resolved in the UI layer so this stays pure data.
	labelKey: string;
	colors: PaletteColors;
};

// Palette literals (not CSS tokens) so each card renders its own theme
// regardless of the page palette; column-first 3×2 pairs light/dark on mobile.
export const THEMES: readonly ThemeOption[] = [
	{
		palette: 'neutral',
		mode: 'light',
		labelKey: 'settings.appearance.theme.neutral.light',
		colors: {
			bg: '#fff',
			titlebar: '#f5f5f5',
			dot: '#d4d4d4',
			sidebar: '#e5e5e5',
			title: '#171717',
			body: '#d4d4d4',
			border: '#e5e5e5',
			borderHover: '#d4d4d4'
		}
	},
	{
		palette: 'neutral',
		mode: 'dark',
		labelKey: 'settings.appearance.theme.neutral.dark',
		colors: {
			bg: '#171717',
			titlebar: '#262626',
			dot: '#525252',
			sidebar: '#404040',
			title: '#d4d4d4',
			body: '#525252',
			border: '#404040',
			borderHover: '#525252'
		}
	},
	{
		palette: 'nord',
		mode: 'light',
		labelKey: 'settings.appearance.theme.nord.light',
		colors: {
			bg: '#eceff4',
			titlebar: '#e5e9f0',
			dot: '#d8dee9',
			sidebar: '#e5e9f0',
			title: '#2e3440',
			body: '#4c566a',
			border: '#d8dee9',
			borderHover: '#c8cdd4'
		}
	},
	{
		palette: 'nord',
		mode: 'dark',
		labelKey: 'settings.appearance.theme.nord.dark',
		colors: {
			bg: '#2e3440',
			titlebar: '#3b4252',
			dot: '#5e81ac',
			sidebar: '#3b4252',
			title: '#88c0d0',
			body: '#4c566a',
			border: '#3b4252',
			borderHover: '#4c566a'
		}
	},
	{
		palette: 'contrast',
		mode: 'light',
		labelKey: 'settings.appearance.theme.contrast.light',
		colors: {
			bg: '#ffffff',
			titlebar: '#fafafa',
			dot: '#eaeaea',
			sidebar: '#fafafa',
			title: '#000000',
			body: '#666666',
			border: '#eaeaea',
			borderHover: '#d4d4d4'
		}
	},
	{
		palette: 'contrast',
		mode: 'dark',
		labelKey: 'settings.appearance.theme.contrast.dark',
		colors: {
			bg: '#000000',
			titlebar: '#0a0a0a',
			dot: '#333333',
			sidebar: '#1a1a1a',
			title: '#ededed',
			body: '#888888',
			border: '#282828',
			borderHover: '#3a3a3a'
		}
	}
];

export function themeKey(palette: Palette, mode: Mode): string {
	return `${palette}-${mode}`;
}

export function parseThemeKey(key: string): { palette: Palette; mode: Mode } {
	const [palette, mode] = key.split('-') as [Palette, Mode];
	return { palette, mode };
}
