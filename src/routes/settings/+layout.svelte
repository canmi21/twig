<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();
	let sectionEl: HTMLElement;
	let activeId = $state(page.url.hash.slice(1) || 'general');

	const TABS = [
		{ id: 'general', label: () => m['settings.tab.general']() },
		{ id: 'appearance', label: () => m['settings.tab.appearance']() },
		{ id: 'typography', label: () => m['settings.tab.typography']() },
		{ id: 'account', label: () => m['settings.tab.account']() },
		{ id: 'privacy', label: () => m['settings.tab.privacy']() }
	] as const;

	function scrollTo(id: string) {
		activeId = id;
		const target = sectionEl?.querySelector(`#${id}`);
		target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function handleScroll() {
		if (!sectionEl || sectionEl.scrollTop > 20) return;
		activeId = 'general';
	}
</script>

<!-- Mobile: stacked column. lg+: sidebar + content side-by-side -->
<div class="flex h-svh flex-col lg:flex-row">
	<!-- Mobile top tab bar (horizontal scroll) -->
	<nav class="shrink-0 border-b border-divider px-4 pt-4 pb-0 lg:hidden">
		<h1 class="mb-3 text-lg font-semibold text-foreground">{m['settings.title']()}</h1>
		<div class="-mb-px flex gap-1 overflow-x-auto">
			{#each TABS as tab (tab.id)}
				{@const active = activeId === tab.id}
				<button
					onclick={() => scrollTo(tab.id)}
					class="shrink-0 border-b-2 px-3 pb-2 text-sm whitespace-nowrap {active
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'}"
					aria-current={active ? 'page' : undefined}
				>
					{tab.label()}
				</button>
			{/each}
		</div>
	</nav>

	<!-- Desktop sidebar -->
	<nav class="hidden shrink-0 self-start pt-20 pl-8 lg:block">
		<div class="w-58 xl:w-[16rem]">
			<h1 class="mb-5 pl-4 text-2xl font-semibold text-foreground">{m['settings.title']()}</h1>
			<ul class="flex flex-col gap-1">
				{#each TABS as tab (tab.id)}
					{@const active = activeId === tab.id}
					<li>
						<button
							onclick={() => scrollTo(tab.id)}
							class="block w-full rounded-lg px-4 py-2 text-left text-sm {active
								? 'bg-inset text-foreground'
								: 'text-muted-foreground hover:text-foreground hover:bg-inset/50'}"
							aria-current={active ? 'page' : undefined}
						>
							{tab.label()}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</nav>

	<section
		bind:this={sectionEl}
		onscroll={handleScroll}
		class="flex-1 overflow-y-auto px-4 pt-6 pb-12 sm:px-6 lg:pt-20 lg:pl-10 lg:pr-8"
	>
		<div class="mx-auto max-w-4xl lg:pl-6 2xl:max-w-5xl">
			{@render children()}
		</div>
	</section>
</div>
