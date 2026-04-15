<script lang="ts">
	import { page } from '$app/state';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	import { m } from '$lib/paraglide/messages';
	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime';
	import { setThemeCookie } from '$lib/theme/script';

	import IconTranslate from '~icons/mingcute/translate-2-line';
	import IconUpSmall from '~icons/mingcute/up-small-line';
	import IconWorld2Line from '~icons/mingcute/world-2-line';
	import IconTranslateLine from '~icons/mingcute/translate-line';
	import IconTranslate2Line from '~icons/mingcute/translate-2-line';
	import IconTranslate2AiLine from '~icons/mingcute/translate-2-ai-line';
	import IconSunLine from '~icons/mingcute/sun-line';
	import IconMoonLine from '~icons/mingcute/moon-line';
	import IconMoonStarsLine from '~icons/mingcute/moon-stars-line';

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

	const MOONS = [IconMoonLine, IconMoonStarsLine];

	let isDark = $state(page.data.theme === 'dark');
	let moonIdx = $state(0);
	let langOpen = $state(false);
	let langMenuRef: HTMLDivElement | undefined;

	const MoonIcon = $derived(MOONS[moonIdx]);

	function toggleTheme() {
		const next = !isDark;
		isDark = next;
		document.documentElement.classList.toggle('dark', next);
		setThemeCookie(next ? 'dark' : 'light');
		// Pick a random moon when entering dark mode so every toggle feels fresh.
		if (next) moonIdx = Math.floor(Math.random() * MOONS.length);
	}

	function selectLocale(l: Locale) {
		langOpen = false;
		if (l !== currentLocale) setLocale(l);
	}

	// Local-only rotate + fade used when the Sun/Moon glyph swaps. Everything
	// else on the page flips colors instantly — this animation is scoped to the
	// icon that was clicked.
	function rotateFade(_node: Element, { duration = 280 }: { duration?: number } = {}) {
		return {
			duration,
			easing: cubicOut,
			css: (t: number, u: number) => `opacity: ${t}; transform: rotate(${u * 90}deg);`
		};
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

<div class="fixed top-3 right-3 z-50 flex items-center gap-3">
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
	<button
		type="button"
		onclick={toggleTheme}
		aria-label={isDark ? m['theme.toggle.light']() : m['theme.toggle.dark']()}
		class="relative size-4 text-muted-foreground hover:text-foreground"
	>
		{#if isDark}
			<span class="absolute inset-0" in:rotateFade out:rotateFade>
				<MoonIcon class="h-4 w-auto" />
			</span>
		{:else}
			<span class="absolute inset-0" in:rotateFade out:rotateFade>
				<IconSunLine class="h-4 w-auto" />
			</span>
		{/if}
	</button>
</div>
