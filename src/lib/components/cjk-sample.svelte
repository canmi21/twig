<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		sc: string;
		tc: string;
		jp: string;
	}

	let { sc, tc, jp }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center">
	<span class="text-3xl text-foreground/80" style="font-family: {sc}, {tc}, {jp}, serif"
		>{m['settings.appearance.font.cjk.preview']()}</span
	>
	<span
		class="mt-1 w-full truncate px-2 text-center text-[0.6rem] text-muted-foreground"
		style="font-family: {sc}, {tc}, {jp}, serif">{m['settings.appearance.font.cjk.sample']()}</span
	>
</div>
