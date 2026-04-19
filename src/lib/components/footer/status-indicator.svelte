<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
</script>

<span class="inline-flex items-center gap-1.5">
	<span aria-hidden="true" class="relative inline-block size-1.5">
		<span
			class="absolute inset-0 rounded-full bg-success {motion.value === 'full'
				? 'animate-breathe'
				: ''}"
		></span>
		<span class="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full bg-success/30"
		></span>
		<span class="absolute top-1/2 left-1/2 size-1.25 -translate-1/2 rounded-full bg-success"></span>
	</span>
	<a
		href="https://now.innc.cc"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.status.aria']()}
		class="focus-ring hover:text-foreground focus-visible:text-foreground"
		>{m['footer.status.normal']()}</a
	>
</span>
