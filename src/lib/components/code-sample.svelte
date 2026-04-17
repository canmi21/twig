<script lang="ts">
	interface Props {
		family: string;
	}

	let { family }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center">
	<span class="text-2xl text-foreground/80" style="font-family: {family}">=&gt;</span>
	<span
		class="mt-1 w-full truncate px-2 text-center text-[0.55rem] text-muted-foreground"
		style="font-family: {family}">fn main() {'{'} 0 }</span
	>
</div>
