<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { setThemeCookie } from '$lib/theme/script';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	const brand = 'twig';

	let isDark = $state(page.data.theme === 'dark');

	function toggle() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		setThemeCookie(isDark ? 'dark' : 'light');
	}
</script>

<nav class="flex h-(--nav-h) items-center justify-between border-b border-divider px-4">
	<a href={resolve('/')} class="text-lg font-semibold text-foreground">{brand}</a>
	<button
		type="button"
		onclick={toggle}
		aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
		class="text-muted-foreground hover:text-foreground"
	>
		{#if isDark}
			<Sun class="size-5" />
		{:else}
			<Moon class="size-5" />
		{/if}
	</button>
</nav>
