<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		active?: boolean;
		onclick?: (() => void) | undefined;
		children: Snippet;
	}

	let { label, active = false, onclick, children }: Props = $props();
</script>

<button
	{onclick}
	class="group flex flex-col items-center gap-2 focus-visible:outline-none"
	class:cursor-default={!onclick}
>
	<div
		class="frame focus-ring-inner h-23.5 w-31 overflow-hidden rounded-lg border-2 {active
			? 'border-blue-500'
			: 'border-border hover:border-muted-foreground/50'}"
	>
		{@render children()}
	</div>
	<span class="text-xs {active ? 'font-medium text-foreground' : 'text-muted-foreground'}"
		>{label}</span
	>
</button>

<style>
	/* Match WindowCard: pull the focus ring fully onto the 2px border so an
	   active card reads as a single ring instead of stacking blues. */
	:focus-visible .frame {
		outline-offset: -2px;
	}
</style>
