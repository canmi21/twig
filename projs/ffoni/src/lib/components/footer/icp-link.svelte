<script lang="ts">
	import Lollipop from '@lucide/svelte/icons/lollipop';

	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	const href =
		getLocale() === 'zh' ? 'https://beian.miit.gov.cn' : 'https://icp.gov.moe/?keyword=20260000';
</script>

<a
	{href}
	target="_blank"
	rel="noopener noreferrer"
	aria-label={m['footer.icp.aria']()}
	class="focus-ring inline-flex items-center gap-1 hover:text-foreground focus-visible:text-foreground"
>
	<Lollipop class="size-3.25" strokeWidth={2} aria-hidden="true" />
	<span>{m['footer.icp.text']()}</span>
</a>
