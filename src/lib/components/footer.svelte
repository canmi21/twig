<script lang="ts">
	import Greeting from './footer/greeting.svelte';
	import Social from './footer/social.svelte';
	import Copyright from './footer/copyright.svelte';
	import StatusIndicator from './footer/status-indicator.svelte';
	import IcpLink from './footer/icp-link.svelte';
	import CommitLink from './footer/commit-link.svelte';

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
		<div class="mx-auto w-full px-3 sm:px-6">
			<div class="border-t border-dashed border-divider"></div>
			<div
				class="grid w-full grid-cols-[1fr_auto] items-end gap-x-3 gap-y-1.5 pt-3 text-[0.8125rem] text-muted-foreground sm:grid-cols-[1fr_auto_auto_auto] sm:gap-x-2"
			>
				<Copyright />
				<div class="hidden sm:order-2 sm:block">
					<StatusIndicator />
				</div>
				<div class="order-2 sm:order-3">
					<IcpLink />
				</div>
				<div class="hidden sm:order-4 sm:block">
					<CommitLink />
				</div>
			</div>
		</div>
	</div>
</footer>
