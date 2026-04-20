<script lang="ts" module>
	import type { Component } from 'svelte';

	export type DevDockTool = { id: string; label: string; icon: Component };
	export type DevDockEdge = 'left' | 'right';
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import type { Snippet } from 'svelte';

	type Props = {
		tools: readonly DevDockTool[];
		panel: Snippet<[string]>;
		storageKey?: string;
	};

	let { tools, panel, storageKey = 'twig:dev-dock' }: Props = $props();

	type Persisted = { open: boolean; active: string; edge: DevDockEdge };

	function readPersisted(): Persisted {
		const fallback: Persisted = { open: false, active: tools[0]?.id ?? '', edge: 'left' };
		if (!browser) return fallback;
		try {
			const raw = sessionStorage.getItem(storageKey);
			if (!raw) return fallback;
			const parsed = JSON.parse(raw) as Partial<Persisted>;
			const active =
				typeof parsed.active === 'string' && tools.some((t) => t.id === parsed.active)
					? parsed.active
					: fallback.active;
			const edge: DevDockEdge = parsed.edge === 'right' ? 'right' : 'left';
			return { open: Boolean(parsed.open), active, edge };
		} catch {
			return fallback;
		}
	}

	let open = $state(false);
	let active = $state<string>(tools[0]?.id ?? '');
	let edge = $state<DevDockEdge>('left');
	let hydrated = $state(false);

	// Hydrate after mount to keep SSR output stable; persist writes gated on the
	// same flag so the default state never clobbers the stored one.
	$effect(() => {
		if (!browser || hydrated) return;
		const p = readPersisted();
		open = p.open;
		active = p.active;
		edge = p.edge;
		hydrated = true;
	});

	$effect(() => {
		if (!hydrated) return;
		sessionStorage.setItem(storageKey, JSON.stringify({ open, active, edge }));
	});

	const activeLabel = $derived(tools.find((t) => t.id === active)?.label ?? '');
	const isLeft = $derived(edge === 'left');

	function snapToEdge(next: DevDockEdge) {
		if (next === edge) return;
		edge = next;
	}
</script>

{#if !open}
	<button
		type="button"
		class="focus-ring fixed top-1/2 z-999 flex h-12 w-3.5 -translate-y-1/2 items-center justify-center border-y border-border bg-background text-muted-foreground hover:text-foreground"
		class:left-0={isLeft}
		class:right-0={!isLeft}
		class:rounded-r-md={isLeft}
		class:rounded-l-md={!isLeft}
		class:border-r={isLeft}
		class:border-l={!isLeft}
		aria-label="Open dev tools"
		onclick={() => (open = true)}
	>
		{#if isLeft}
			<ChevronRight class="size-3" />
		{:else}
			<ChevronLeft class="size-3" />
		{/if}
	</button>
{:else}
	<aside
		class="fixed top-1/2 z-999 flex h-72 w-64 -translate-y-1/2 border-y border-border bg-background shadow-lg"
		class:left-0={isLeft}
		class:right-0={!isLeft}
		class:rounded-r-lg={isLeft}
		class:rounded-l-lg={!isLeft}
		class:border-r={isLeft}
		class:border-l={!isLeft}
		class:flex-row={isLeft}
		class:flex-row-reverse={!isLeft}
		aria-label="Dev tools"
	>
		<nav
			class="flex w-9 flex-col items-center justify-between border-divider py-2"
			class:border-r={isLeft}
			class:border-l={!isLeft}
			aria-label="Dev tool categories"
		>
			<div class="flex flex-col gap-1">
				{#each tools as tool (tool.id)}
					{@const Icon = tool.icon}
					<button
						type="button"
						class="focus-ring flex size-7 items-center justify-center rounded-md hover:bg-muted"
						class:bg-muted={active === tool.id}
						class:text-foreground={active === tool.id}
						class:text-muted-foreground={active !== tool.id}
						aria-label={tool.label}
						aria-current={active === tool.id ? 'page' : undefined}
						onclick={() => (active = tool.id)}
					>
						<Icon class="size-3.5" />
					</button>
				{/each}
			</div>
			<div class="flex flex-col gap-1">
				<button
					type="button"
					class="focus-ring flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label={isLeft ? 'Snap to right edge' : 'Snap to left edge'}
					onclick={() => snapToEdge(isLeft ? 'right' : 'left')}
				>
					{#if isLeft}
						<PanelRight class="size-3.5" />
					{:else}
						<PanelLeft class="size-3.5" />
					{/if}
				</button>
				<button
					type="button"
					class="focus-ring flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Collapse dev tools"
					onclick={() => (open = false)}
				>
					{#if isLeft}
						<ChevronLeft class="size-3.5" />
					{:else}
						<ChevronRight class="size-3.5" />
					{/if}
				</button>
			</div>
		</nav>

		<div class="flex flex-1 flex-col overflow-hidden">
			<header class="border-b border-divider px-3 py-2">
				<span class="text-[10px] tracking-wide text-muted-foreground uppercase">{activeLabel}</span>
			</header>
			<div class="flex-1 overflow-y-auto px-3 py-2">
				{@render panel(active)}
			</div>
		</div>
	</aside>
{/if}
