<script lang="ts">
	type Kind = 'native' | 'twemoji' | 'noto' | 'fluent';

	interface Props {
		kind: Kind;
	}

	let { kind }: Props = $props();

	const TWEMOJI = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/';
	const NOTO = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/';
	const FLUENT = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/';

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

<div class="flex h-full items-center justify-center gap-1.5">
	{#if kind === 'native'}
		{#each EMOJIS as e (e.code)}
			<span class="text-[1.75rem] leading-none">{e.alt}</span>
		{/each}
	{:else if kind === 'twemoji'}
		{#each EMOJIS as e (e.code)}
			<img src="{TWEMOJI}{e.code}.svg" alt={e.alt} class="size-7" />
		{/each}
	{:else if kind === 'noto'}
		{#each EMOJIS as e (e.code)}
			<img src="{NOTO}emoji_u{e.code}.svg" alt={e.alt} class="size-7" />
		{/each}
	{:else if kind === 'fluent'}
		{#each EMOJIS as e (e.code)}
			<img src="{FLUENT}{e.fluent}" alt={e.alt} class="size-7" />
		{/each}
	{/if}
</div>
