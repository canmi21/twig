<script lang="ts">
	import '../styles/app.css';
	import { page } from '$app/state';
	import { baseLocale, locales } from '$lib/paraglide/runtime';
	import { canonicalPath, htmlLangFor, localizedPath } from '$lib/i18n/urls';
	import Footer from '$lib/components/footer.svelte';
	import LanguageSwitcher from '$lib/components/language-switcher.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';

	let { data, children } = $props();

	const alternateLocales = locales.filter((l) => l !== baseLocale);
</script>

<svelte:head>
	<link rel="canonical" href="{__PUBLIC_URL__}{canonicalPath(page.url)}" />
	{#each alternateLocales as locale (locale)}
		<link
			rel="alternate"
			hreflang={htmlLangFor(locale)}
			href="{__PUBLIC_URL__}{localizedPath(page.url.pathname, locale)}"
		/>
	{/each}
	<link
		rel="alternate"
		hreflang="x-default"
		href="{__PUBLIC_URL__}{localizedPath(page.url.pathname, baseLocale)}"
	/>
	<link rel="alternate" type="application/atom+xml" title="Canmi" href="{__PUBLIC_URL__}/feed" />
</svelte:head>

<div class="fixed top-4 right-4 z-50 flex items-center gap-3">
	<LanguageSwitcher />
	<ThemeToggle />
</div>
<main class="flex min-h-svh flex-col">
	{@render children()}
</main>
<Footer runtimeDays={data.runtimeDays} />
