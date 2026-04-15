<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let { runtimeDays }: { runtimeDays: number } = $props();

	const accountName = 'Canmi';
	const presenceCount = 1;
</script>

<div>
	<div class="text-xl font-semibold text-foreground">Hi, {accountName}</div>
	<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
		<span>{m['footer.runtime.days']({ days: runtimeDays })}</span>
		<span>{m['footer.presence']({ count: presenceCount })}</span>
	</div>
</div>
