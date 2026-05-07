<script lang="ts" generics="T extends string">
	import type { Snippet } from 'svelte';
	import CardRow from '$lib/components/cards/card-row.svelte';

	type BP = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	type Cols = Partial<Record<BP, number>>;

	type OptionItem<K extends string> = {
		key: K;
		label: string;
		// Screen-reader name override. Use to attach a one-line description
		// ("Full — All animations enabled") so the toggle reads usefully without
		// the visible caption shrinking. Defaults to label.
		aria?: string;
	};

	interface Props {
		value: T;
		onValueChange: (v: T) => void;
		options: ReadonlyArray<OptionItem<T>>;
		layout: 'wrap' | 'scroll' | 'custom';
		cols?: Cols;
		class?: string;
		// Heading id from the surrounding SettingSection. Pulls the group's
		// accessible name from the visible h3 instead of duplicating it.
		ariaLabelledby?: string;
		ariaDescribedby?: string;
		// Caller owns the card visual. Spreading `props` onto a <button> wires
		// aria-pressed + click; Enter/Space come for free from native semantics.
		card: Snippet<[{ option: OptionItem<T>; props: Record<string, unknown>; pressed: boolean }]>;
	}

	let {
		value,
		onValueChange,
		options,
		layout,
		cols,
		class: klass,
		ariaLabelledby,
		ariaDescribedby,
		card
	}: Props = $props();

	// Toggle-button-group (WAI-ARIA APG): role="group" with aria-pressed buttons,
	// no roving tabindex so focus and selection stay decoupled.
</script>

<div role="group" aria-labelledby={ariaLabelledby} aria-describedby={ariaDescribedby}>
	<CardRow {layout} {cols} class={klass}>
		{#each options as opt (opt.key)}
			{@const pressed = value === opt.key}
			{@const props = {
				'aria-label': opt.aria ?? opt.label,
				'aria-pressed': pressed,
				onclick: () => onValueChange(opt.key)
			}}
			{@render card({ option: opt, props, pressed })}
		{/each}
	</CardRow>
</div>
