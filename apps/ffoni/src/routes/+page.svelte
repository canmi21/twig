<script lang="ts">
	import LanguageSwitcher from '$lib/components/toggles/language-switcher.svelte';
	import ThemeToggle from '$lib/components/toggles/theme-toggle.svelte';
</script>

<header class="fixed top-4 right-4 z-50 flex items-center gap-3">
	<LanguageSwitcher />
	<ThemeToggle />
</header>
<div class="flex flex-1 items-center justify-center text-muted-foreground">hello, world</div>
