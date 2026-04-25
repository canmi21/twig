<script lang="ts">
	import LanguageSwitcher from '$lib/components/toggles/language-switcher.svelte';
	import ThemeToggle from '$lib/components/toggles/theme-toggle.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<header class="fixed top-4 right-4 z-50 flex items-center gap-3">
	<LanguageSwitcher />
	<ThemeToggle />
</header>
<div
	role="note"
	class="flex h-10 shrink-0 items-center justify-center border-b border-border bg-background px-4 text-xs text-muted-foreground shadow-[0_-1px_0_var(--color-border)]"
>
	<span class="truncate">{m['banner.wip.text']()}</span>
</div>
<div class="flex flex-1 items-center justify-center text-muted-foreground">hello, world</div>
