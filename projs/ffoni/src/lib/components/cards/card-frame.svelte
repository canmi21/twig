<script lang="ts">
	import type { Snippet } from 'svelte';
	import { motion } from '$lib/motion/state.svelte';

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
		// Idle/hover border vars. WindowCard passes palette literals so chrome
		// matches the theme it's showing; other previews inherit the page theme.
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

	// Skip press feedback in motion=none: the CSS rule flattens the animation,
	// so `animationend` never fires and `flashing` would latch true.
	let flashing = $state(false);

	function handleClick(e: Event) {
		(buttonProps?.onclick as ((e: Event) => void) | undefined)?.(e);
		if (motion.value === 'none') return;
		flashing = true;
	}

	const mergedProps = $derived(
		buttonProps?.onclick ? { ...buttonProps, onclick: handleClick } : buttonProps
	);
	const doScale = $derived(flashing && motion.value === 'full');
</script>

<button
	{...mergedProps}
	type="button"
	class="group flex w-full flex-col items-center gap-2 outline-none"
	class:cursor-default={!buttonProps?.onclick && !buttonProps?.role}
>
	<div
		class="frame relative aspect-124/94 w-full overflow-hidden rounded-lg border-2"
		class:border-blue-500={active}
		class:press-scale={doScale}
		style:background={bg}
		style:--border-idle={borderIdle ?? 'var(--color-border)'}
		style:--border-hover={borderHover ??
			'color-mix(in oklch, var(--color-muted-foreground) 50%, transparent)'}
		{...attrs}
	>
		{#if flashing}
			<span
				class="press-flash pointer-events-none absolute inset-0 bg-blue-500"
				onanimationend={() => (flashing = false)}
			></span>
		{/if}
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
	/* Recolour the existing 2px border for focus (instead of a negative-offset
	   outline) to avoid a 1-frame paint flash and keep forced-colors working. */
	:global(:focus-visible) .frame:not(:global(.border-blue-500)) {
		border-color: var(--color-blue-500);
	}
</style>
