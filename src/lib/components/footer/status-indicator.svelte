<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<span class="relative inline-block">
	<span aria-hidden="true" class="absolute top-1/2 -left-3 size-1.5 -translate-y-1/2">
		<span class="absolute inset-0 rounded-full bg-success motion-safe:animate-breathe"></span>
		<span class="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full bg-success/30"
		></span>
		<span class="absolute top-1/2 left-1/2 size-1.25 -translate-1/2 rounded-full bg-success"></span>
	</span>
	<a
		href="https://status.canmi.net/8zxeLKSP2t"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.status.aria']()}
		class="focus-ring hover:text-foreground focus-visible:text-foreground"
		>{m['footer.status.normal']()}</a
	>
</span>
