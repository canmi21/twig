<script lang="ts">
	import '../styles/app.css';
	import { page } from '$app/state';
	import { baseLocale, locales } from '$lib/paraglide/runtime';
	import { canonicalPath, htmlLangFor, localizedPath } from '$lib/i18n/urls';
	import { setClientCdnHosts } from '$lib/cdn/hosts';
	import Footer from '$lib/components/footer.svelte';

	let { data, children } = $props();

	// $effect.pre flushes before any child $effect, so runtime font-injection
	// helpers (settings page, pickers) see the mirror hosts before they build
	// their first URL. Tracks data.cdn reactively but in practice it's stable
	// per session (derived from Cloudflare's country header).
	$effect.pre(() => {
		setClientCdnHosts(data.cdn);
	});

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

<main class="flex min-h-svh flex-col">
	{@render children()}
</main>
{#if !page.url.pathname.startsWith('/settings')}
	<Footer runtimeDays={data.runtimeDays} />
{/if}
