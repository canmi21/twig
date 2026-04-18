<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		active?: boolean;
		// Spread onto the inner <button>. RadioGroup.Item passes role="radio",
		// aria-checked, onclick, tabindex, data-state, etc. via this single prop;
		// non-radio callers can pass `{ onclick: () => ... }` to keep it simple.
		buttonProps?: Record<string, unknown>;
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
		// Extra attributes applied to the frame div, not the button (e.g.
		// `data-motion-exempt` so motion preview cards keep animating even when
		// the global motion preference is None).
		attrs?: Record<string, unknown>;
		children: Snippet;
	}

	let {
		label,
		active = false,
		buttonProps,
		bg,
		borderIdle,
		borderHover,
		attrs,
		children
	}: Props = $props();
</script>

<button
	{...buttonProps}
	type="button"
	class="group flex w-full flex-col items-center gap-2 outline-none"
	class:cursor-default={!buttonProps?.onclick && !buttonProps?.role}
>
	<div
		class="frame aspect-124/94 w-full overflow-hidden rounded-lg border-2"
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
	/* Focus indicator: recolor the element's own 2px border to blue rather than
	   overlaying a negative-offset outline. Two wins:
	   - No geometry reconciliation — the 2px is already rendered, we only swap
	     its colour, so Chromium/WebKit can't paint a transient "too large"
	     frame the way a stacked outline with negative offset can.
	   - `forced-colors` mode still gets a real indicator: the UA recolours
	     border-colour to system highlight the same way it does an outline, so
	     we don't need a `transparent`-outline stub (which, paired with the
	     button's always-off outline, risked painting as a 1-frame white flash
	     on first Tab-focus in some macOS Chromium paint cycles).
	   Listed after the idle/hover rules above so it wins on source order at
	   equal specificity. */
	:global(:focus-visible) .frame:not(:global(.border-blue-500)) {
		border-color: var(--color-blue-500);
	}
</style>
