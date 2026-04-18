<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		active?: boolean;
		onclick?: (() => void) | undefined;
		// Optional inline background for the frame (WindowCard uses a palette
		// literal so the preview is self-contained and ignores the page theme).
		// Sample-style cards leave this undefined and inherit the page surface.
		bg?: string;
		// CSS variables driving the idle/hover border. WindowCard passes palette
		// literals so the preview chrome matches the theme it's showing. When
		// omitted we fall back to the semantic border tokens, which is what
		// font / emoji / code previews want (they live on the page background
		// and should track its theme).
		borderIdle?: string;
		borderHover?: string;
		attrs?: Record<string, unknown>;
		children: Snippet;
	}

	let {
		label,
		active = false,
		onclick,
		bg,
		borderIdle,
		borderHover,
		attrs,
		children
	}: Props = $props();
</script>

<button
	{onclick}
	class="group flex w-full flex-col items-center gap-2 focus-visible:outline-none"
	class:cursor-default={!onclick}
>
	<div
		class="frame focus-ring-inner aspect-124/94 w-full overflow-hidden rounded-lg border-2"
		class:border-blue-500={active}
		style:background={bg}
		style:--border-idle={borderIdle ?? 'var(--color-border)'}
		style:--border-hover={borderHover ??
			'color-mix(in oklch, var(--color-muted-foreground) 50%, transparent)'}
		{...attrs}
	>
		{@render children()}
	</div>
	<span
		class="text-xs"
		class:text-foreground={active}
		class:font-medium={active}
		class:text-muted-foreground={!active}>{label}</span
	>
</button>

<style>
	/* Idle + hover border via CSS vars so both palette-literal and token-driven
	   callers share one path. An active (border-blue-500) card always wins,
	   otherwise --border-idle (→ hover: --border-hover) takes over. */
	.frame:not(:global(.border-blue-500)) {
		border-color: var(--border-idle);
	}
	.frame:not(:global(.border-blue-500)):hover {
		border-color: var(--border-hover);
	}
	/* Pull the focus ring fully onto the 2px border so an active card reads as a
	   single ring instead of stacking blues; on idle cards the outline simply
	   replaces the gray border while focused. */
	:focus-visible .frame {
		outline-offset: -2px;
	}
</style>
