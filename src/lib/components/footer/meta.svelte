<script lang="ts">
	import StatusIndicator from './status-indicator.svelte';
	import IcpLink from './icp-link.svelte';
	import CommitLink from './commit-link.svelte';
</script>

<span class="flex flex-wrap items-center gap-x-2 text-left sm:justify-end sm:text-right">
	<StatusIndicator />
	<IcpLink />
	<CommitLink />
</span>
