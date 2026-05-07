<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { FONT_IDS, FONTS, type FontFamily } from '$lib/font/data';
	import { applyFont } from '$lib/font/client';
	import SampleCard from '$lib/components/cards/sample-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	let currentFont = $state<FontFamily>(page.data.font);

	const fontOptions = $derived(
		FONT_IDS.map((id) => ({
			key: id,
			label: FONTS[id].label,
			family: FONTS[id].stack
		}))
	);

	function selectFont(key: string) {
		const id = key as FontFamily;
		currentFont = id;
		applyFont(id);
	}
</script>

<SettingSection
	id="typography-font"
	title={m['settings.appearance.font']()}
	description={m['settings.appearance.font.desc']()}
	level={3}
>
	<SettingOptions
		value={currentFont}
		onValueChange={selectFont}
		options={fontOptions}
		layout="scroll"
		cols={{ base: 3, sm: 4 }}
		ariaLabelledby="typography-font-title"
		ariaDescribedby="typography-font-desc"
	>
		{#snippet card({ option, props, pressed })}
			{@const family = fontOptions.find((o) => o.key === option.key)?.family ?? ''}
			<SampleCard
				variant="font"
				label={option.label}
				{family}
				active={pressed}
				buttonProps={props}
			/>
		{/snippet}
	</SettingOptions>
</SettingSection>
