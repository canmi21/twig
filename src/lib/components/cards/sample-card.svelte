<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Variant =
		| { variant: 'font'; family: string; sample?: string }
		| { variant: 'cjk'; sc: string; tc: string; jp: string }
		| { variant: 'code'; family: string }
		| { variant: 'emoji'; kind: 'native' | 'twemoji' | 'noto' | 'fluent' };

	type Props = {
		label: string;
		active?: boolean;
		onclick?: (() => void) | undefined;
	} & Variant;

	let props: Props = $props();

	const TWEMOJI = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/';
	const NOTO = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/';
	const FLUENT = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';

	const EMOJIS = [
		{
			alt: '😊',
			code: '1f60a',
			fluent: 'Smiling%20face%20with%20smiling%20eyes/3D/smiling_face_with_smiling_eyes_3d.png'
		},
		{ alt: '🔥', code: '1f525', fluent: 'Fire/3D/fire_3d.png' },
		{ alt: '🎉', code: '1f389', fluent: 'Party%20popper/3D/party_popper_3d.png' }
	];
</script>

<button
	onclick={props.onclick}
	class="group flex flex-col items-center gap-2 focus-visible:outline-none"
	class:cursor-default={!props.onclick}
>
	<div
		class="frame focus-ring-inner h-23.5 w-31 overflow-hidden rounded-lg border-2 {props.active
			? 'border-blue-500'
			: 'border-border hover:border-muted-foreground/50'}"
	>
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
				<span class="text-2xl text-foreground/80" style="font-family: {props.family}">=&gt;</span>
				<span
					class="mt-1 w-full truncate px-2 text-center text-[0.55rem] text-muted-foreground"
					style="font-family: {props.family}">fn main() {'{'} 0 }</span
				>
			</div>
		{:else if props.variant === 'emoji'}
			<div class="flex h-full items-center justify-center gap-1.5">
				{#if props.kind === 'native'}
					{#each EMOJIS as e (e.code)}
						<span class="text-[1.75rem] leading-none">{e.alt}</span>
					{/each}
				{:else if props.kind === 'twemoji'}
					{#each EMOJIS as e (e.code)}
						<img src="{TWEMOJI}{e.code}.svg" alt={e.alt} class="size-7" />
					{/each}
				{:else if props.kind === 'noto'}
					{#each EMOJIS as e (e.code)}
						<img src="{NOTO}emoji_u{e.code}.svg" alt={e.alt} class="size-7" />
					{/each}
				{:else if props.kind === 'fluent'}
					{#each EMOJIS as e (e.code)}
						<img src="{FLUENT}{e.fluent}" alt={e.alt} class="size-7" />
					{/each}
				{/if}
			</div>
		{/if}
	</div>
	<span class="text-xs {props.active ? 'font-medium text-foreground' : 'text-muted-foreground'}"
		>{props.label}</span
	>
</button>

<style>
	/* Match WindowCard: pull the focus ring fully onto the 2px border so an
	   active card reads as a single ring instead of stacking blues. */
	:focus-visible .frame {
		outline-offset: -2px;
	}
</style>
