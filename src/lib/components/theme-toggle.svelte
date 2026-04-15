<script lang="ts">
	import { page } from '$app/state';
	import { cubicOut } from 'svelte/easing';
	import { Toggle } from 'bits-ui';

	import { m } from '$lib/paraglide/messages';
	import { setThemeCookie } from '$lib/theme/script';

	import IconSunLine from '~icons/mingcute/sun-line';
	import IconMoonLine from '~icons/mingcute/moon-line';
	import IconMoonStarsLine from '~icons/mingcute/moon-stars-line';

	const MOONS = [IconMoonLine, IconMoonStarsLine];

	let isDark = $state(page.data.theme === 'dark');
	let moonIdx = $state(0);

	const MoonIcon = $derived(MOONS[moonIdx]);

	function handlePressedChange(next: boolean) {
		document.documentElement.classList.toggle('dark', next);
		setThemeCookie(next ? 'dark' : 'light');
		// Pick a random moon when entering dark mode so every toggle feels fresh.
		if (next) moonIdx = Math.floor(Math.random() * MOONS.length);
	}

	// Local-only rotate + fade used when the sun / moon glyph swaps. Everything
	// else on the page flips colors instantly — this animation is scoped to the
	// icon that was clicked.
	function rotateFade(_node: Element, { duration = 280 }: { duration?: number } = {}) {
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
	class="relative size-4 text-muted-foreground hover:text-foreground"
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
