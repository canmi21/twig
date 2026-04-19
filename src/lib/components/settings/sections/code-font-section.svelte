<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import {
		CODE_FAMILIES,
		CODE_FONT_IDS,
		CODE_FONT_LABELS,
		type CodeFont
	} from '$lib/font/code-data';
	import { applyCodeFont } from '$lib/font/code-client';
	import SampleCard from '$lib/components/cards/sample-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	let currentCodeFont = $state<CodeFont>(page.data.codeFont);

	const codeOptions = $derived(
		CODE_FONT_IDS.map((id) => ({
			key: id,
			label: CODE_FONT_LABELS[id],
			family: CODE_FAMILIES[id]
		}))
	);

	function selectCode(key: string) {
		const id = key as CodeFont;
		currentCodeFont = id;
		applyCodeFont(id);
	}
</script>

<SettingSection
	id="typography-code"
	title={m['settings.appearance.code.font']()}
	description={m['settings.appearance.code.font.desc']()}
	level={3}
>
	<SettingOptions
		value={currentCodeFont}
		onValueChange={selectCode}
		options={codeOptions}
		layout="scroll"
		cols={{ base: 3, sm: 4 }}
		ariaLabelledby="typography-code-title"
		ariaDescribedby="typography-code-desc"
	>
		{#snippet card({ option, props, pressed })}
			{@const family = codeOptions.find((o) => o.key === option.key)?.family ?? ''}
			<SampleCard
				variant="code"
				label={option.label}
				{family}
				active={pressed}
				buttonProps={props}
			/>
		{/snippet}
	</SettingOptions>
</SettingSection>
