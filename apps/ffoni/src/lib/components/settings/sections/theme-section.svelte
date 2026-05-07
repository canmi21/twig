<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { applyTheme } from '$lib/theme/client';
	import type { ThemeState } from '$lib/theme/data';
	import { THEMES, parseThemeKey, themeKey } from '$lib/theme/palettes';
	import ThemeCard from '$lib/components/cards/theme-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	let currentTheme = $state<ThemeState>(page.data.theme);

	const currentThemeKey = $derived(themeKey(currentTheme.palette, currentTheme.mode));

	const themeOptions = $derived(
		THEMES.map((t) => {
			// Paraglide's `m` union signature widens to "requires args" because some
			// message keys have non-empty inputs; cast to the zero-arg shape per key.
			const label = m[t.labelKey as keyof typeof m] as () => string;
			return {
				key: themeKey(t.palette, t.mode),
				label: label(),
				data: t
			};
		})
	);

	function selectTheme(key: string) {
		const next: ThemeState = parseThemeKey(key);
		currentTheme = next;
		applyTheme(next);
	}
</script>

<SettingSection
	id="appearance-theme"
	title={m['settings.appearance.theme']()}
	description={m['settings.appearance.theme.desc']()}
	level={3}
>
	<!-- Column-first flow at 3×2 keeps lights on the top row and darks on the
	    bottom so each column is a light/dark pair. At sm+ it collapses back
	    to a single 6-col row, so grid-flow-row preserves the source order. -->
	<SettingOptions
		value={currentThemeKey}
		onValueChange={selectTheme}
		options={themeOptions}
		layout="custom"
		class="grid max-w-104 grid-flow-col grid-cols-3 grid-rows-2 gap-3 sm:max-w-212 sm:grid-flow-row sm:grid-cols-6 sm:grid-rows-1 sm:gap-4"
		ariaLabelledby="appearance-theme-title"
		ariaDescribedby="appearance-theme-desc"
	>
		{#snippet card({ option, props, pressed })}
			{@const data = themeOptions.find((o) => o.key === option.key)?.data}
			{#if data}
				<ThemeCard label={option.label} active={pressed} buttonProps={props} colors={data.colors} />
			{/if}
		{/snippet}
	</SettingOptions>
</SettingSection>
