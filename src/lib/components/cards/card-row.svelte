<script lang="ts">
	import type { Snippet } from 'svelte';

	type BP = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	type Cols = Partial<Record<BP, number>>;

	interface Props {
		// 'custom' passes class through for caller-owned grids; 'wrap' uses a
		// cols-per-bp grid; 'scroll' overflows horizontally for swipe UX.
		layout: 'custom' | 'wrap' | 'scroll';
		// Per-breakpoint column counts. Missing breakpoints inherit the nearest
		// smaller one, so `{ base: 3, md: 4 }` means 3 up to md, 4 from md on.
		cols?: Cols;
		class?: string;
		children: Snippet;
	}

	let { layout, cols = {}, class: klass = '', children }: Props = $props();

	const BP_ORDER: BP[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

	// 3 on phones is a product hard-rule (smallest viewport must fit 3 without
	// scroll); widens to 4/5/6, fixed-count sections override via `cols`.
	const DEFAULTS: Record<BP, number> = {
		base: 3,
		sm: 4,
		md: 4,
		lg: 4,
		xl: 5,
		'2xl': 6
	};

	const resolved = $derived.by(() => {
		const out = { ...DEFAULTS };
		let last = cols.base ?? DEFAULTS.base;
		for (const bp of BP_ORDER) {
			if (cols[bp] != null) last = cols[bp]!;
			out[bp] = last;
		}
		return out;
	});

	const styleVars = $derived(BP_ORDER.map((bp) => `--cols-${bp}:${resolved[bp]}`).join(';'));
</script>

{#if layout === 'custom'}
	<div class={klass}>{@render children()}</div>
{:else}
	<div class="card-row card-row-{layout} {klass}" style={styleVars}>
		{@render children()}
	</div>
{/if}

<style>
	/* --card-cap = motion's max-w-104 (26rem) / 3 ≈ 131px — the shared
	   card-width DNA every section sizes to, so densities stay consistent. */
	.card-row {
		--card-cap: 8.1875rem;
		--gap: 0.75rem;
		gap: var(--gap);
	}
	@media (min-width: 640px) {
		.card-row {
			--gap: 1rem;
		}
	}

	.card-row-wrap {
		display: grid;
		grid-template-columns: repeat(var(--cols-base), minmax(0, var(--card-cap)));
		justify-content: start;
	}
	@media (min-width: 640px) {
		.card-row-wrap {
			grid-template-columns: repeat(var(--cols-sm), minmax(0, var(--card-cap)));
		}
	}
	@media (min-width: 768px) {
		.card-row-wrap {
			grid-template-columns: repeat(var(--cols-md), minmax(0, var(--card-cap)));
		}
	}
	@media (min-width: 1024px) {
		.card-row-wrap {
			grid-template-columns: repeat(var(--cols-lg), minmax(0, var(--card-cap)));
		}
	}
	@media (min-width: 1280px) {
		.card-row-wrap {
			grid-template-columns: repeat(var(--cols-xl), minmax(0, var(--card-cap)));
		}
	}
	@media (min-width: 1536px) {
		.card-row-wrap {
			grid-template-columns: repeat(var(--cols-2xl), minmax(0, var(--card-cap)));
		}
	}

	/* Each card is min(viewport/cols, --card-cap): phones fill, desktops
	   cap; only the 500–640px tweener leaves trailing whitespace by design. */
	.card-row-scroll {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		padding-bottom: 0.25rem;
		/* Hide the horizontal scrollbar only on this row — the page's
		   vertical scrollbar (html/body) uses its own --color-scrollbar
		   token and is unaffected. */
		scrollbar-width: none;
	}
	.card-row-scroll::-webkit-scrollbar {
		display: none;
	}
	.card-row-scroll > :global(*) {
		flex: 0 0 calc((100% - (var(--cols-base) - 1) * var(--gap)) / var(--cols-base));
		max-width: var(--card-cap);
		scroll-snap-align: start;
	}
	@media (min-width: 640px) {
		.card-row-scroll > :global(*) {
			flex-basis: calc((100% - (var(--cols-sm) - 1) * var(--gap)) / var(--cols-sm));
		}
	}
	@media (min-width: 768px) {
		.card-row-scroll > :global(*) {
			flex-basis: calc((100% - (var(--cols-md) - 1) * var(--gap)) / var(--cols-md));
		}
	}
	@media (min-width: 1024px) {
		.card-row-scroll > :global(*) {
			flex-basis: calc((100% - (var(--cols-lg) - 1) * var(--gap)) / var(--cols-lg));
		}
	}
	@media (min-width: 1280px) {
		.card-row-scroll > :global(*) {
			flex-basis: calc((100% - (var(--cols-xl) - 1) * var(--gap)) / var(--cols-xl));
		}
	}
	@media (min-width: 1536px) {
		.card-row-scroll > :global(*) {
			flex-basis: calc((100% - (var(--cols-2xl) - 1) * var(--gap)) / var(--cols-2xl));
		}
	}
</style>
