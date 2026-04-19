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

	// Single source of truth — `remaining` drives both the visual bar and the
	// dismissal. rAF decrements it per frame; hover/focus cancel the frame and
	// freeze everything on the same tick.
	const totalMs = typeof item.duration === 'number' ? item.duration : 0;
	let remaining = $state(totalMs);
	let lastTickAt = 0;
	let rafId: number | null = null;

	const progress = $derived.by(() => {
		if (item.duration === 'pinned') return 1;
		if (totalMs === 0) return 0;
		return Math.max(0, Math.min(1, remaining / totalMs));
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

	function pause() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	onMount(() => {
		start();
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	// Only the left edge takes the kind color; other sides stay `border-border`.
	const accent = {
		info: 'border-l-border',
		success: 'border-l-success',
		warn: 'border-l-yellow-500/60',
		error: 'border-l-destructive'
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
	onmouseenter={pause}
	onmouseleave={start}
	onfocusin={pause}
	onfocusout={start}
	in:fly={flyParams()}
	out:fade={fadeParams()}
	class="toast pointer-events-auto relative flex w-80 items-start gap-3 overflow-hidden rounded-md border-l-4 border border-border bg-muted p-3 shadow-md {accent[
		item.kind
	]}"
>
	<span aria-hidden="true" class="toast-bar" style={barStyle}></span>
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
		class="focus-ring shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
	>
		<X class="size-4" />
	</button>
</div>
