<script lang="ts">
	import '../styles/app.css';
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import { baseLocale, locales } from '$lib/paraglide/runtime';
	import { canonicalPath, htmlLangFor, localizedPath } from '$lib/i18n/urls';
	import { setClientCdnHosts } from '$lib/cdn/hosts';
	import Footer from '$lib/components/footer.svelte';
	import NotificationHost from '$lib/components/notification/host.svelte';
	import DevOverlay from '$lib/dev/overlay/dev-overlay.svelte';

	let { data, children } = $props();

	// $effect.pre installs mirror hosts before any child $effect font-injection
	// helper composes its first CDN URL.
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
<NotificationHost />
{#if dev}
	<DevOverlay user={data.devUser} />
{/if}
