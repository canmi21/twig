<script lang="ts">
	let isDark = $state(false);

	function toggle() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
	}
</script>

<main class="flex min-h-screen items-center justify-center">
	<button
		onclick={toggle}
		class="rounded-lg border border-neutral-400 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
	>
		{isDark ? 'switch to light' : 'switch to dark'}
	</button>
</main>
