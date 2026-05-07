<script lang="ts">
	import { notifications } from '$lib/notification/state.svelte';
</script>

<div class="flex flex-1 flex-wrap items-start gap-2 p-8">
	<button
		type="button"
		onclick={() =>
			notifications.push({
				title: 'Heads up',
				body: 'Default 5s toast — hover to pause.',
				kind: 'info'
			})}
		class="focus-ring rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-inset"
	>
		Info · 5s
	</button>
	<button
		type="button"
		onclick={() =>
			notifications.push({
				title: 'Saved',
				body: 'Short success ping.',
				kind: 'success',
				duration: 2500
			})}
		class="focus-ring rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-inset"
	>
		Success · 2.5s
	</button>
	<button
		type="button"
		onclick={() =>
			notifications.push({
				title: 'Careful',
				body: 'Something looks off.',
				kind: 'warn'
			})}
		class="focus-ring rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-inset"
	>
		Warn · 5s
	</button>
	<button
		type="button"
		onclick={() =>
			notifications.push({
				title: 'Failed',
				body: 'Error kind — stays 8s, announces assertively.',
				kind: 'error',
				duration: 8000
			})}
		class="focus-ring rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-inset"
	>
		Error · 8s
	</button>
	<button
		type="button"
		onclick={() =>
			notifications.push({
				title: 'Pinned',
				body: 'Stays until you hit the × button.',
				kind: 'info',
				duration: 'pinned'
			})}
		class="focus-ring rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-inset"
	>
		Pinned
	</button>
	<button
		type="button"
		onclick={() => notifications.clear()}
		class="focus-ring rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
	>
		Clear all
	</button>
</div>
