<script lang="ts">
	interface Props {
		family: string;
		sample?: string;
	}

	let { family, sample = 'Aa' }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center">
	<span class="text-3xl text-foreground/80" style="font-family: {family}">{sample}</span>
	<span
		class="mt-1 w-full truncate px-2 text-center text-[0.6rem] text-muted-foreground"
		style="font-family: {family}">The quick brown fox</span
	>
</div>
