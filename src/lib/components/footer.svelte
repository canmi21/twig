<script lang="ts">
	import Greeting from './footer/greeting.svelte';
	import Social from './footer/social.svelte';
	import Copyright from './footer/copyright.svelte';
	import Meta from './footer/meta.svelte';

	let { runtimeDays }: { runtimeDays: number } = $props();
</script>

<footer class="border-t border-divider">
	<div class="px-5 py-3">
		<div class="mx-auto w-full px-3 sm:px-6">
			<div class="flex items-start gap-6">
				<div class="min-w-0 space-y-3 pt-4 text-foreground/72">
					<Greeting {runtimeDays} />
					<Social />
				</div>
			</div>
		</div>
	</div>

	<div class="px-5 pb-3">
		<div class="mx-3 border-t border-dashed border-divider sm:mx-6"></div>
		<div
			class="flex w-full flex-col gap-y-1.5 px-3 pt-3 text-[0.8125rem] text-muted-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6"
		>
			<Copyright />
			<Meta />
		</div>
	</div>
</footer>
