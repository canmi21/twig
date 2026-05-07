<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import {
		EMOJI_FAMILIES,
		EMOJI_FONT_IDS,
		EMOJI_FONT_LABELS,
		type EmojiFont
	} from '$lib/font/emoji-data';
	import { applyEmojiFont } from '$lib/font/emoji-client';
	import SampleCard from '$lib/components/cards/sample-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	let currentEmojiFont = $state<EmojiFont>(page.data.emojiFont);

	const emojiOptions = $derived(
		EMOJI_FONT_IDS.map((id) => ({
			key: id,
			label: EMOJI_FONT_LABELS[id],
			family: EMOJI_FAMILIES[id]
		}))
	);

	function selectEmoji(key: string) {
		const id = key as EmojiFont;
		currentEmojiFont = id;
		applyEmojiFont(id);
	}
</script>

<SettingSection
	id="typography-emoji"
	title={m['settings.appearance.emoji']()}
	description={m['settings.appearance.emoji.desc']()}
	level={3}
>
	<SettingOptions
		value={currentEmojiFont}
		onValueChange={selectEmoji}
		options={emojiOptions}
		layout="scroll"
		cols={{ base: 3 }}
		ariaLabelledby="typography-emoji-title"
		ariaDescribedby="typography-emoji-desc"
	>
		{#snippet card({ option, props, pressed })}
			{@const family = emojiOptions.find((o) => o.key === option.key)?.family ?? ''}
			<SampleCard
				variant="emoji"
				label={option.label}
				{family}
				active={pressed}
				buttonProps={props}
			/>
		{/snippet}
	</SettingOptions>
</SettingSection>
