<script lang="ts">
	import '../styles/app.css';
	import Navbar from '$lib/components/navbar.svelte';
	import Footer from '$lib/components/footer.svelte';

	let { data, children } = $props();
</script>

<Navbar />
<main class="flex min-h-[calc(100svh-var(--nav-h))] flex-col">
	{@render children()}
</main>
<Footer runtimeDays={data.runtimeDays} />
