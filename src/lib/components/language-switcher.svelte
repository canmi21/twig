<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	import { m } from '$lib/paraglide/messages';
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
		tw: IconTranslate2AiLine,
		ja: IconTranslate2AiLine
	};

	let langOpen = $state(false);

	function handleSelect(l: Locale) {
		if (l !== currentLocale) setLocale(l);
	}
</script>

<DropdownMenu.Root bind:open={langOpen}>
	<DropdownMenu.Trigger
		aria-label={m['language.switcher']()}
		class="focus-ring flex items-center text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground"
	>
		<IconTranslate class="h-4 w-auto" />
		<span class="ml-1">{LOCALE_LABELS[currentLocale]}</span>
		<IconUpSmall
			class="ml-px h-4 w-auto transition-transform duration-200 ease-out {langOpen
				? 'rotate-180'
				: ''}"
		/>
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content sideOffset={8} align="end" forceMount>
			{#snippet child({ wrapperProps, props, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:fade={{ duration: 200, easing: cubicOut }}
							out:fade={{ duration: 200, easing: cubicOut }}
							class="z-50 min-w-27 overflow-hidden rounded-md border border-divider bg-background shadow-sm outline-none"
						>
							{#each locales as l (l)}
								{@const Icon = LOCALE_ICONS[l]}
								{@const isCurrent = l === currentLocale}
								<DropdownMenu.Item
									onSelect={() => handleSelect(l)}
									aria-current={isCurrent ? 'true' : undefined}
									class="group flex w-full cursor-pointer items-center justify-between gap-2 px-2 py-1 text-left text-sm outline-none data-highlighted:bg-muted"
								>
									<span class={isCurrent ? 'text-foreground' : 'text-muted-foreground'}
										>{LOCALE_LABELS[l]}</span
									>
									<Icon
										class="h-4 w-auto text-muted-foreground group-data-highlighted:text-foreground"
									/>
								</DropdownMenu.Item>
							{/each}
						</div>
					</div>
				{/if}
			{/snippet}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
