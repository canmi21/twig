<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';

	import { motion } from '$lib/motion/state.svelte';
	import { notifications } from '$lib/notification/state.svelte';
	import Item from './item.svelte';

	function flipParams() {
		const pref = motion.value;
		if (pref === 'none') return { duration: 0 };
		if (pref === 'reduce') return { duration: 150, easing: cubicOut };
		return { duration: 240, easing: cubicOut };
	}

	// Collapse height + margin only; Item.svelte fades its own root in parallel,
	// so touching opacity here would make the two transitions fight.
	function collapseOut(node: HTMLElement) {
		const pref = motion.value;
		if (pref === 'none') return { duration: 0 };
		const height = node.offsetHeight;
		const style = getComputedStyle(node);
		const mt = parseFloat(style.marginTop) || 0;
		const duration = pref === 'reduce' ? 150 : 200;
		return {
			duration,
			easing: cubicOut,
			css: (t: number) => `
				height: ${t * height}px;
				margin-top: ${t * mt}px;
				overflow: hidden;
			`
		};
	}
</script>

<div
	aria-label="Notifications"
	class="pointer-events-none fixed top-16 right-4 z-40 flex flex-col space-y-2"
>
	{#each notifications.items as item (item.id)}
		<div out:collapseOut animate:flip={flipParams()}>
			<Item {item} />
		</div>
	{/each}
</div>
