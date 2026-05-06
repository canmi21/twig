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

// Every value resolves through src/styles/palette.css (or Tailwind's own
// --color-neutral-* scale for the neutral preview) so these cards stay in
// lockstep with the semantic tokens that share the same source.
export const THEMES: readonly ThemeOption[] = [
	{
		palette: 'neutral',
		mode: 'light',
		labelKey: 'settings.appearance.theme.neutral.light',
		colors: {
			bg: 'var(--color-white)',
			titlebar: 'var(--color-neutral-100)',
			dot: 'var(--color-neutral-300)',
			sidebar: 'var(--color-neutral-200)',
			title: 'var(--color-neutral-900)',
			body: 'var(--color-neutral-300)',
			border: 'var(--color-neutral-200)',
			borderHover: 'var(--color-neutral-300)'
		}
	},
	{
		palette: 'neutral',
		mode: 'dark',
		labelKey: 'settings.appearance.theme.neutral.dark',
		colors: {
			bg: 'var(--color-neutral-900)',
			titlebar: 'var(--color-neutral-800)',
			dot: 'var(--color-neutral-600)',
			sidebar: 'var(--color-neutral-700)',
			title: 'var(--color-neutral-300)',
			body: 'var(--color-neutral-600)',
			border: 'var(--color-neutral-700)',
			borderHover: 'var(--color-neutral-600)'
		}
	},
	{
		palette: 'nord',
		mode: 'light',
		labelKey: 'settings.appearance.theme.nord.light',
		colors: {
			bg: 'var(--palette-nord-6)',
			titlebar: 'var(--palette-nord-5)',
			dot: 'var(--palette-nord-4)',
			sidebar: 'var(--palette-nord-5)',
			title: 'var(--palette-nord-0)',
			body: 'var(--palette-nord-3)',
			border: 'var(--palette-nord-4)',
			borderHover: 'var(--palette-nord-hover)'
		}
	},
	{
		palette: 'nord',
		mode: 'dark',
		labelKey: 'settings.appearance.theme.nord.dark',
		colors: {
			bg: 'var(--palette-nord-0)',
			titlebar: 'var(--palette-nord-1)',
			dot: 'var(--palette-nord-10)',
			sidebar: 'var(--palette-nord-1)',
			title: 'var(--palette-nord-8)',
			body: 'var(--palette-nord-3)',
			border: 'var(--palette-nord-1)',
			borderHover: 'var(--palette-nord-3)'
		}
	},
	{
		palette: 'contrast',
		mode: 'light',
		labelKey: 'settings.appearance.theme.contrast.light',
		colors: {
			bg: 'var(--palette-mono-12)',
			titlebar: 'var(--palette-mono-11)',
			dot: 'var(--palette-mono-9)',
			sidebar: 'var(--palette-mono-11)',
			title: 'var(--palette-mono-0)',
			body: 'var(--palette-mono-6)',
			border: 'var(--palette-mono-9)',
			borderHover: 'var(--palette-mono-8)'
		}
	},
	{
		palette: 'contrast',
		mode: 'dark',
		labelKey: 'settings.appearance.theme.contrast.dark',
		colors: {
			bg: 'var(--palette-mono-0)',
			titlebar: 'var(--palette-mono-1)',
			dot: 'var(--palette-mono-4)',
			sidebar: 'var(--palette-mono-2)',
			title: 'var(--palette-mono-10)',
			body: 'var(--palette-mono-7)',
			border: 'var(--palette-mono-3)',
			borderHover: 'var(--palette-mono-5)'
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
