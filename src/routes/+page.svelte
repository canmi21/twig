<script lang="ts">
	import { page } from '$app/state';
	import { setThemeCookie } from '$lib/theme/script';

	let isDark = $state(page.data.theme === 'dark');

	function toggle() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		setThemeCookie(isDark ? 'dark' : 'light');
	}
</script>

<div class="flex flex-1 items-center justify-center">
	<button
		onclick={toggle}
		class="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
	>
		{isDark ? 'switch to light' : 'switch to dark'}
	</button>
</div>
