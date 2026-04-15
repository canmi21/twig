<script lang="ts">
	import '../styles/app.css';
	import Footer from '$lib/components/footer.svelte';

	let { data, children } = $props();
</script>

<main class="flex min-h-svh flex-col">
	{@render children()}
</main>
<Footer runtimeDays={data.runtimeDays} />
