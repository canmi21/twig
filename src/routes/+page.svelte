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
		class="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
	>
		{isDark ? 'switch to light' : 'switch to dark'}
	</button>
</main>
