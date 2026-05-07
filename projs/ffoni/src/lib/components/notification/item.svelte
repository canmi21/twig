<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import X from '@lucide/svelte/icons/x';

	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import { notifications } from '$lib/notification/state.svelte';
	import type { Notification } from '$lib/notification/script';

	let { item }: { item: Notification } = $props();

	// `remaining` drives both the bar and the dismiss; hover/focus cancels the
	// rAF so both freeze on the same tick. item.duration is stable per mount.
	let remaining = $state(0);
	let lastTickAt = 0;
	let rafId: number | null = null;

	$effect.pre(() => {
		remaining = typeof item.duration === 'number' ? item.duration : 0;
	});

	const progress = $derived.by(() => {
		if (item.duration === 'pinned') return 1;
		const total = typeof item.duration === 'number' ? item.duration : 0;
		if (total === 0) return 0;
		return Math.max(0, Math.min(1, remaining / total));
	});

	const barStyle = $derived.by(() => {
		const mode = motion.value;
		if (mode === 'none') return 'transform: scaleX(1); transform-origin: left;';
		if (mode === 'reduce') return `opacity: ${progress};`;
		return `transform: scaleX(${progress}); transform-origin: left;`;
	});

	function tick() {
		const now = Date.now();
		remaining = Math.max(0, remaining - (now - lastTickAt));
		lastTickAt = now;
		if (remaining <= 0) {
			rafId = null;
			notifications.dismiss(item.id);
			return;
		}
		rafId = requestAnimationFrame(tick);
	}

	function start() {
		if (item.duration === 'pinned') return;
		if (rafId !== null) return;
		lastTickAt = Date.now();
		rafId = requestAnimationFrame(tick);
	}

	function stop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	// Hover on any toast pauses all of them — driven by the shared counter in
	// the store. This effect is the single bridge between global paused state
	// and this item's rAF loop.
	$effect(() => {
		if (notifications.paused) stop();
		else start();
	});

	onMount(() => {
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	// Left accent as an absolute strip (see .toast-accent). Keeps the card's
	// border uniformly 1px so rounded corners stay clean. Info reuses the
	// border color so the strip visually disappears for neutral toasts.
	const accent = {
		info: 'bg-border',
		success: 'bg-success',
		warn: 'bg-yellow-500/60',
		error: 'bg-destructive'
	} as const;

	function flyParams() {
		const pref = motion.value;
		if (pref === 'none') return { duration: 0, x: 0 };
		if (pref === 'reduce') return { duration: 150, x: 0, easing: cubicOut };
		return { duration: 240, x: 24, easing: cubicOut };
	}
	function fadeParams() {
		const pref = motion.value;
		if (pref === 'none') return { duration: 0 };
		if (pref === 'reduce') return { duration: 120 };
		return { duration: 200 };
	}
</script>

<div
	role={item.kind === 'error' ? 'alert' : 'status'}
	aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
	onmouseenter={notifications.hoverEnter}
	onmouseleave={notifications.hoverLeave}
	onfocusin={notifications.hoverEnter}
	onfocusout={notifications.hoverLeave}
	in:fly={flyParams()}
	out:fade={fadeParams()}
	class="toast group pointer-events-auto relative flex w-80 items-start gap-3 overflow-hidden rounded-md border border-border bg-muted p-3 shadow-md"
>
	<span aria-hidden="true" class="toast-bar" style={barStyle}></span>
	<span aria-hidden="true" class="toast-accent {accent[item.kind]}"></span>
	<div class="min-w-0 flex-1">
		<div class="text-sm font-medium text-foreground">{item.title}</div>
		{#if item.body}
			<div class="mt-0.5 text-xs text-muted-foreground">{item.body}</div>
		{/if}
	</div>
	<button
		type="button"
		onclick={() => notifications.dismiss(item.id)}
		aria-label={m['notification.dismiss']()}
		class="focus-ring shrink-0 rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
	>
		<X class="size-4" />
	</button>
</div>
