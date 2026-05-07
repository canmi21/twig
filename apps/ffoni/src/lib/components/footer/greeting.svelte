<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import GreetingName from './greeting-name.svelte';

	let { runtimeDays }: { runtimeDays: number } = $props();

	const presenceCount = 1;
</script>

<div>
	<GreetingName />
	<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
		<span>{m['footer.runtime.days']({ days: runtimeDays })}</span>
		<span>{m['footer.presence']({ count: presenceCount })}</span>
	</div>
</div>
