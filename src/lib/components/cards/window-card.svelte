<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardFrame from './card-frame.svelte';

	interface Props {
		label: string;
		active?: boolean;
		onclick?: (() => void) | undefined;
		bg: string;
		titlebar: string;
		dot: string;
		border: string;
		borderHover: string;
		attrs?: Record<string, unknown>;
		children: Snippet;
	}

	let {
		label,
		active = false,
		onclick,
		bg,
		titlebar,
		dot,
		border,
		borderHover,
		attrs,
		children
	}: Props = $props();
</script>

<CardFrame {label} {active} {onclick} {bg} borderIdle={border} {borderHover} {attrs}>
	<div class="flex h-full flex-col">
		<div class="flex h-3 items-center gap-1 px-2" style:background={titlebar}>
			<span class="size-1 rounded-full" style:background={dot}></span>
			<span class="size-1 rounded-full" style:background={dot}></span>
			<span class="size-1 rounded-full" style:background={dot}></span>
		</div>
		<div class="flex-1 p-2">
			{@render children()}
		</div>
	</div>
</CardFrame>
