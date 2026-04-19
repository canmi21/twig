<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';

	let { children } = $props();
	let activeId = $state(page.url.hash.slice(1) || 'general');

	const TABS = [
		{ id: 'general', label: () => m['settings.tab.general']() },
		{ id: 'appearance', label: () => m['settings.tab.appearance']() },
		{ id: 'typography', label: () => m['settings.tab.typography']() }
	] as const;

	// Button refs for the mobile underline + desktop pill sliders. Each tab
	// binds its button so we can measure offsetLeft/Width (mobile) and
	// offsetTop/Height (desktop) whenever activeId changes.
	let mobileBtns = $state<Record<string, HTMLButtonElement | null>>({});
	let desktopBtns = $state<Record<string, HTMLButtonElement | null>>({});
	let underline = $state<{ x: number; w: number }>({ x: 0, w: 0 });
	let pill = $state<{ y: number; h: number }>({ y: 0, h: 0 });

	$effect(() => {
		const b = mobileBtns[activeId];
		if (b) underline = { x: b.offsetLeft, w: b.offsetWidth };
	});
	$effect(() => {
		const b = desktopBtns[activeId];
		if (b) pill = { y: b.offsetTop, h: b.offsetHeight };
	});
	$effect(() => {
		const onResize = () => {
			const mb = mobileBtns[activeId];
			if (mb) underline = { x: mb.offsetLeft, w: mb.offsetWidth };
			const db = desktopBtns[activeId];
			if (db) pill = { y: db.offsetTop, h: db.offsetHeight };
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	// Fires the heading pulse once the landed section actually enters the
	// viewport — firing immediately would play the animation while the smooth
	// scroll is still in flight. IntersectionObserver self-disconnects after
	// one hit; if the heading is already visible (user clicked the active
	// tab), the observer callback fires synchronously on the next frame.
	function pulseHeadingOnArrival(target: Element | null) {
		if (!target || motion.value === 'none') return;
		const h3 = target.querySelector<HTMLElement>('h3');
		if (!h3) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) return;
				io.disconnect();
				h3.classList.remove('heading-pulse');
				void h3.offsetWidth;
				h3.classList.add('heading-pulse');
				h3.addEventListener('animationend', () => h3.classList.remove('heading-pulse'), {
					once: true
				});
			},
			{ threshold: 0.6 }
		);
		io.observe(h3);
	}

	function focusSection(id: string) {
		activeId = id;
		const target = document.getElementById(id);
		target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		pulseHeadingOnArrival(target);
	}

	function handleScroll() {
		if (window.scrollY > 20) return;
		activeId = 'general';
	}

	// SvelteKit's client-side scroll manager suppresses the browser's native
	// "scroll to hash on load" behavior. Restore it explicitly so refreshing
	// /settings#appearance lands on the right section.
	$effect(() => {
		const id = page.url.hash.slice(1);
		if (!id) return;
		activeId = id;
		requestAnimationFrame(() => {
			const target = document.getElementById(id);
			target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			pulseHeadingOnArrival(target);
		});
	});

	// Slider elements only exist in Full; Reduce/None fall back to per-button
	// color swaps (caught by the global 120ms transition on <button>).
	const showSlider = $derived(motion.value === 'full');
</script>

<svelte:window onscroll={handleScroll} />

<div class="flex min-h-svh flex-col lg:flex-row">
	<nav class="shrink-0 border-b border-divider px-4 pt-4 pb-0 lg:hidden">
		<h1 class="mb-3 text-lg font-semibold text-foreground">{m['settings.title']()}</h1>
		<div class="relative -mb-px flex gap-1 overflow-x-auto">
			{#each TABS as tab (tab.id)}
				{@const active = activeId === tab.id}
				{@const stateClass = active
					? showSlider
						? 'border-transparent text-foreground'
						: 'border-foreground text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'}
				<button
					bind:this={mobileBtns[tab.id]}
					onclick={() => focusSection(tab.id)}
					class="focus-ring shrink-0 border-b-2 px-3 pb-2 text-sm whitespace-nowrap focus-visible:text-foreground {stateClass}"
					aria-current={active ? 'page' : undefined}
				>
					{tab.label()}
				</button>
			{/each}
			{#if showSlider && underline.w > 0}
				<span
					class="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-foreground transition-[transform,width] duration-220 ease-out"
					style:transform="translateX({underline.x}px)"
					style:width="{underline.w}px"
				></span>
			{/if}
		</div>
	</nav>

	<nav class="sticky top-0 hidden h-svh shrink-0 self-start pt-20 pl-8 lg:block">
		<div class="w-58 xl:w-[16rem]">
			<h1 class="mb-5 pl-4 text-2xl font-semibold text-foreground">{m['settings.title']()}</h1>
			<ul class="relative flex flex-col gap-1">
				{#if showSlider && pill.h > 0}
					<span
						class="pointer-events-none absolute inset-x-0 rounded-lg bg-inset transition-[transform,height] duration-220 ease-out"
						style:transform="translateY({pill.y}px)"
						style:height="{pill.h}px"
					></span>
				{/if}
				{#each TABS as tab (tab.id)}
					{@const active = activeId === tab.id}
					{@const stateClass = active
						? showSlider
							? 'text-foreground'
							: 'bg-inset text-foreground'
						: 'text-muted-foreground hover:bg-inset/50 hover:text-foreground'}
					<li>
						<button
							bind:this={desktopBtns[tab.id]}
							onclick={() => focusSection(tab.id)}
							class="relative block w-full rounded-lg px-4 py-2 text-left text-sm focus-visible:text-foreground focus-visible:outline-none {stateClass}"
							aria-current={active ? 'page' : undefined}
						>
							<span class="focus-ring-inner">{tab.label()}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</nav>

	<section class="flex-1 px-4 pt-6 pb-12 sm:px-6 lg:pt-20 lg:pl-10 lg:pr-8">
		<div class="mx-auto max-w-4xl lg:pl-6 2xl:max-w-5xl">
			{@render children()}
		</div>
	</section>
</div>
