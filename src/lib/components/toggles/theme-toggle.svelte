<script lang="ts">
	import { page } from '$app/state';
	import { cubicOut } from 'svelte/easing';
	import { Toggle } from 'bits-ui';

	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import { applyTheme } from '$lib/theme/script';

	import IconSunLine from '~icons/mingcute/sun-line';
	import IconMoonLine from '~icons/mingcute/moon-line';
	import IconMoonStarsLine from '~icons/mingcute/moon-stars-line';

	const MOONS = [IconMoonLine, IconMoonStarsLine];

	let isDark = $state(page.data.theme.mode === 'dark');
	let moonIdx = $state(0);

	const MoonIcon = $derived(MOONS[moonIdx]);

	function handlePressedChange(next: boolean) {
		applyTheme({ mode: next ? 'dark' : 'light' });
		// Randomize moon icon each time dark mode activates.
		if (next) moonIdx = Math.floor(Math.random() * MOONS.length);
	}

	function rotateFade(_node: Element, { duration = 280 }: { duration?: number } = {}) {
		const pref = motion.value;
		if (pref === 'none') return { duration: 0, css: () => '' };
		if (pref === 'reduce') {
			return {
				duration: 120,
				easing: cubicOut,
				css: (t: number) => `opacity: ${t};`
			};
		}
		return {
			duration,
			easing: cubicOut,
			css: (t: number, u: number) => `opacity: ${t}; transform: rotate(${u * 90}deg);`
		};
	}
</script>

<Toggle.Root
	bind:pressed={isDark}
	onPressedChange={handlePressedChange}
	aria-label={isDark ? m['theme.toggle.light']() : m['theme.toggle.dark']()}
	class="focus-ring relative size-4 text-muted-foreground hover:text-foreground focus-visible:text-foreground"
>
	{#if isDark}
		<span class="absolute inset-0" in:rotateFade out:rotateFade>
			<MoonIcon class="h-4 w-auto" />
		</span>
	{:else}
		<span class="absolute inset-0" in:rotateFade out:rotateFade>
			<IconSunLine class="h-4 w-auto" />
		</span>
	{/if}
</Toggle.Root>
