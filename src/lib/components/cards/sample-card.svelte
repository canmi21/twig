<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import CardFrame from './card-frame.svelte';

	type Variant =
		| { variant: 'font'; family: string; sample?: string }
		| { variant: 'cjk'; sc: string; tc: string; jp: string }
		| { variant: 'code'; family: string }
		| { variant: 'emoji'; family: string };

	type Props = {
		label: string;
		active?: boolean;
		buttonProps?: Record<string, unknown>;
	} & Variant;

	let props: Props = $props();

	const EMOJIS = ['😊', '🔥', '🎉'];

	// Noto Color Emoji ships ~25% larger glyph metrics than Twemoji/Apple;
	// shrink only here so preview cards stay optically identical.
	function emojiSize(family: string): string {
		return family.startsWith('"Noto Color Emoji"') ? '1.4rem' : '1.75rem';
	}
</script>

<CardFrame label={props.label} active={props.active} buttonProps={props.buttonProps}>
	{#if props.variant === 'font'}
		<div class="flex h-full flex-col items-center justify-center">
			<span class="text-3xl text-foreground/80" style="font-family: {props.family}"
				>{props.sample ?? 'Aa'}</span
			>
			<span
				class="mt-1 w-full truncate px-2 text-center text-[0.6rem] text-muted-foreground"
				style="font-family: {props.family}">The quick brown fox</span
			>
		</div>
	{:else if props.variant === 'cjk'}
		<div class="flex h-full flex-col items-center justify-center">
			<span
				class="text-3xl text-foreground/80"
				style="font-family: {props.sc}, {props.tc}, {props.jp}, serif"
				>{m['settings.appearance.font.cjk.preview']()}</span
			>
			<span
				class="mt-1 w-full truncate px-2 text-center text-[0.6rem] text-muted-foreground"
				style="font-family: {props.sc}, {props.tc}, {props.jp}, serif"
				>{m['settings.appearance.font.cjk.sample']()}</span
			>
		</div>
	{:else if props.variant === 'code'}
		<div class="flex h-full flex-col items-center justify-center">
			<span class="text-2xl text-foreground/80" style="font-family: {props.family}">&lt;/&gt;</span>
			<span
				class="mt-1 w-full truncate px-2 text-center text-[0.55rem] text-muted-foreground"
				style="font-family: {props.family}">fn main() {'{'} 0 }</span
			>
		</div>
	{:else if props.variant === 'emoji'}
		<div class="flex h-full items-center justify-center gap-1.5">
			{#each EMOJIS as e (e)}
				<span
					class="leading-none"
					style="font-family: {props.family}; font-size: {emojiSize(props.family)}">{e}</span
				>
			{/each}
		</div>
	{/if}
</CardFrame>
