<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { CJK_FAMILIES, CJK_FONT_IDS, labelFor, type CjkFont } from '$lib/font/cjk-data';
	import { applyCjkFont } from '$lib/font/cjk-client';
	import SampleCard from '$lib/components/cards/sample-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	let currentCjkFont = $state<CjkFont>(page.data.cjkFont);

	const cjkOptions = $derived(
		CJK_FONT_IDS.map((id) => ({
			key: id,
			label: labelFor(id, page.data.htmlLang),
			sc: CJK_FAMILIES[id].sc,
			tc: CJK_FAMILIES[id].tc,
			jp: CJK_FAMILIES[id].jp
		}))
	);

	function selectCjk(key: string) {
		const id = key as CjkFont;
		currentCjkFont = id;
		applyCjkFont(id);
	}
</script>

<SettingSection
	id="typography-cjk"
	title={m['settings.appearance.font.cjk']()}
	description={m['settings.appearance.font.cjk.desc']()}
	level={3}
>
	<SettingOptions
		value={currentCjkFont}
		onValueChange={selectCjk}
		options={cjkOptions}
		layout="scroll"
		cols={{ base: 3 }}
		ariaLabelledby="typography-cjk-title"
		ariaDescribedby="typography-cjk-desc"
	>
		{#snippet card({ option, props, pressed })}
			{@const data = cjkOptions.find((o) => o.key === option.key)}
			{#if data}
				<SampleCard
					variant="cjk"
					label={option.label}
					sc={data.sc}
					tc={data.tc}
					jp={data.jp}
					active={pressed}
					buttonProps={props}
				/>
			{/if}
		{/snippet}
	</SettingOptions>
</SettingSection>
