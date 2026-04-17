<script lang="ts">
	import type { Snippet } from 'svelte';

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

<button
	{onclick}
	class="group flex flex-col items-center gap-2 focus-visible:outline-none"
	class:cursor-default={!onclick}
>
	<div
		class="preview focus-ring-inner flex aspect-124/94 w-full flex-col overflow-hidden rounded-lg border-2"
		style:background={bg}
		style:--border-idle={border}
		style:--border-hover={borderHover}
		class:border-blue-500={active}
		{...attrs}
	>
		<div class="flex h-3 items-center gap-1 px-2" style:background={titlebar}>
			<span class="size-1 rounded-full" style:background={dot}></span>
			<span class="size-1 rounded-full" style:background={dot}></span>
			<span class="size-1 rounded-full" style:background={dot}></span>
		</div>
		<div class="flex-1 p-2">
			{@render children()}
		</div>
	</div>
	<span
		class="text-xs"
		class:text-foreground={active}
		class:font-medium={active}
		class:text-muted-foreground={!active}>{label}</span
	>
</button>

<style>
	.preview:not(:global(.border-blue-500)) {
		border-color: var(--border-idle);
	}
	.preview:not(:global(.border-blue-500)):hover {
		border-color: var(--border-hover);
	}
	/* Sit the focus ring fully on top of the 2px border. On an active
	   (border-blue-500) card the two blues coincide and there's no visible
	   change; on idle cards the blue outline simply replaces the gray border
	   for the duration of focus. Canonical 2px ring stays untouched. */
	:focus-visible .preview {
		outline-offset: -2px;
	}
</style>
