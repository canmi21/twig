<script lang="ts">
	import '../styles/app.css';
	import { page } from '$app/state';
	import Footer from '$lib/components/footer.svelte';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="canonical" href="{__PUBLIC_URL__}{page.url.pathname}" />
</svelte:head>

<main class="flex min-h-svh flex-col">
	{@render children()}
</main>
<Footer runtimeDays={data.runtimeDays} />
