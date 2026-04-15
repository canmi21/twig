<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime';

	import IconTranslate from '~icons/mingcute/translate-2-line';
	import IconUpSmall from '~icons/mingcute/up-small-line';
	import IconWorld2Line from '~icons/mingcute/world-2-line';
	import IconTranslateLine from '~icons/mingcute/translate-line';
	import IconTranslate2Line from '~icons/mingcute/translate-2-line';
	import IconTranslate2AiLine from '~icons/mingcute/translate-2-ai-line';

	const currentLocale = getLocale();

	const LOCALE_LABELS: Record<string, string> = {
		mw: 'Global',
		en: 'English',
		zh: '简体中文',
		tw: '繁體中文',
		ja: '日本語'
	};

	const LOCALE_ICONS: Record<string, typeof IconWorld2Line> = {
		mw: IconWorld2Line,
		en: IconTranslateLine,
		zh: IconTranslate2Line,
		tw: IconTranslate2Line,
		ja: IconTranslate2AiLine
	};

	let langOpen = $state(false);
	let langMenuRef: HTMLDivElement | undefined;

	function selectLocale(l: Locale) {
		langOpen = false;
		if (l !== currentLocale) setLocale(l);
	}

	$effect(() => {
		if (!langOpen) return;
		function onClick(e: MouseEvent) {
			if (langMenuRef && !langMenuRef.contains(e.target as Node)) {
				langOpen = false;
			}
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') langOpen = false;
		}
		document.addEventListener('click', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="relative" bind:this={langMenuRef}>
	<button
		type="button"
		onclick={() => (langOpen = !langOpen)}
		aria-label="Switch language"
		aria-expanded={langOpen}
		aria-haspopup="menu"
		class="flex items-center text-sm text-muted-foreground hover:text-foreground"
	>
		<IconTranslate class="h-4 w-auto" />
		<span class="ml-1">{LOCALE_LABELS[currentLocale]}</span>
		<IconUpSmall
			class="ml-px h-4 w-auto transition-transform duration-200 ease-out {langOpen
				? 'rotate-180'
				: ''}"
		/>
	</button>
	{#if langOpen}
		<div
			role="menu"
			in:fade={{ duration: 200, easing: cubicOut }}
			out:fade={{ duration: 200, easing: cubicOut }}
			class="absolute top-full right-0 z-10 mt-2 min-w-27 overflow-hidden rounded-md border border-divider bg-background shadow-sm"
		>
			{#each locales as l (l)}
				{@const Icon = LOCALE_ICONS[l]}
				<button
					type="button"
					role="menuitem"
					onclick={() => selectLocale(l)}
					class="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-sm hover:bg-muted {l ===
					currentLocale
						? 'text-foreground'
						: 'text-muted-foreground'}"
				>
					<span>{LOCALE_LABELS[l]}</span>
					<Icon class="h-4 w-auto" />
				</button>
			{/each}
		</div>
	{/if}
</div>
