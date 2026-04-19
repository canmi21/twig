<script lang="ts">
	import { notifications } from '$lib/notification/state.svelte';
	import Item from './item.svelte';
</script>

<div
	aria-label="Notifications"
	class="pointer-events-none fixed top-16 right-4 z-40 flex flex-col gap-2"
>
	{#each notifications.items as item (item.id)}
		<Item {item} />
	{/each}
</div>
