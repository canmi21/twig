<script lang="ts">
	import '../styles/app.css';
	import { page } from '$app/state';
	import { baseLocale, locales } from '$lib/paraglide/runtime';
	import { canonicalPath, htmlLangFor, localizedPath } from '$lib/i18n/urls';
	import Footer from '$lib/components/footer.svelte';
	import SiteControls from '$lib/components/site-controls.svelte';

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

<SiteControls />
<main class="flex min-h-svh flex-col">
	{@render children()}
</main>
<Footer runtimeDays={data.runtimeDays} />
