<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		// Anchor id used by the sidebar nav and as the prefix for the heading /
		// description ids that nested radiogroups will aria-labelledby/describedby.
		id: string;
		title: string;
		// Optional one-sentence purpose statement rendered under the heading and
		// also exposed via aria-describedby on the section.
		description?: string;
		// 2 = top-level tab section (General, Appearance, …).
		// 3 = nested option group inside a tab (Theme, Motion, Font, …).
		level?: 2 | 3;
		children?: Snippet;
	}

	let { id, title, description, level = 2, children }: Props = $props();

	const titleId = $derived(`${id}-title`);
	const descId = $derived(description ? `${id}-desc` : undefined);
</script>

<section
	{id}
	aria-labelledby={titleId}
	aria-describedby={descId}
	class="scroll-mt-6 lg:scroll-mt-20"
	class:mb-10={level === 2}
>
	<header class="mb-4">
		{#if level === 2}
			<h2 id={titleId} class="text-base font-semibold text-foreground">{title}</h2>
		{:else}
			<h3 id={titleId} class="text-sm font-semibold text-foreground">{title}</h3>
		{/if}
		{#if description}
			<p id={descId} class="mt-1.5 text-sm text-muted-foreground">{description}</p>
		{/if}
	</header>
	{@render children?.()}
</section>
