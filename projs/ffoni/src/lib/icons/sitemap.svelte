<script lang="ts">
	import Fa from 'svelte-fa';
	import { faMap } from '@fortawesome/free-solid-svg-icons';

	let { class: className = '' }: { class?: string } = $props();
</script>

<Fa icon={faMap} class={className} />
