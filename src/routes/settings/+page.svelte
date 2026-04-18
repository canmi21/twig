<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import { applyTheme, type Mode, type Palette, type ThemeState } from '$lib/theme/script';
	import type { MotionPreference } from '$lib/motion/script';
	import {
		applyFont,
		ensureAllFontsLoaded,
		FONT_IDS,
		FONTS,
		type FontFamily
	} from '$lib/font/script';
	import {
		applyCjkFont,
		ensureAllCjkLoaded,
		CJK_FONT_IDS,
		CJK_FAMILIES,
		labelFor,
		type CjkFont
	} from '$lib/font/cjk-script';
	import {
		applyCodeFont,
		ensureAllCodeLoaded,
		CODE_FONT_IDS,
		CODE_FAMILIES,
		CODE_FONT_LABELS,
		type CodeFont
	} from '$lib/font/code-script';
	import {
		applyEmojiFont,
		ensureAllEmojiLoaded,
		EMOJI_FONT_IDS,
		EMOJI_FAMILIES,
		EMOJI_FONT_LABELS,
		type EmojiFont
	} from '$lib/font/emoji-script';
	import ThemeCard from '$lib/components/cards/theme-card.svelte';
	import WindowCard from '$lib/components/cards/window-card.svelte';
	import SampleCard from '$lib/components/cards/sample-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	// Track the live theme so Motion card colors follow palette + mode swaps.
	// We route through CSS tokens rather than the palette's literal colors so
	// any future palette automatically inherits correct preview chrome.
	const MOTION_WINDOW = {
		bg: 'var(--color-background)',
		titlebar: 'var(--color-muted)',
		dot: 'var(--color-muted-foreground)',
		border: 'var(--color-border)',
		borderHover: 'var(--color-muted-foreground)'
	};

	type PaletteColors = {
		bg: string;
		titlebar: string;
		dot: string;
		sidebar: string;
		title: string;
		body: string;
		border: string;
		borderHover: string;
	};

	type ThemeOption = {
		palette: Palette;
		mode: Mode;
		labelKey: () => string;
		colors: PaletteColors;
	};

	const THEMES: ThemeOption[] = [
		{
			palette: 'neutral',
			mode: 'light',
			labelKey: () => m['settings.appearance.theme.neutral.light'](),
			colors: {
				bg: '#fff',
				titlebar: '#f5f5f5',
				dot: '#d4d4d4',
				sidebar: '#e5e5e5',
				title: '#171717',
				body: '#d4d4d4',
				border: '#e5e5e5',
				borderHover: '#d4d4d4'
			}
		},
		{
			palette: 'neutral',
			mode: 'dark',
			labelKey: () => m['settings.appearance.theme.neutral.dark'](),
			colors: {
				bg: '#171717',
				titlebar: '#262626',
				dot: '#525252',
				sidebar: '#404040',
				title: '#d4d4d4',
				body: '#525252',
				border: '#404040',
				borderHover: '#525252'
			}
		},
		{
			palette: 'nord',
			mode: 'light',
			labelKey: () => m['settings.appearance.theme.nord.light'](),
			colors: {
				bg: '#eceff4',
				titlebar: '#e5e9f0',
				dot: '#d8dee9',
				sidebar: '#e5e9f0',
				title: '#2e3440',
				body: '#4c566a',
				border: '#d8dee9',
				borderHover: '#c8cdd4'
			}
		},
		{
			palette: 'nord',
			mode: 'dark',
			labelKey: () => m['settings.appearance.theme.nord.dark'](),
			colors: {
				bg: '#2e3440',
				titlebar: '#3b4252',
				dot: '#5e81ac',
				sidebar: '#3b4252',
				title: '#88c0d0',
				body: '#4c566a',
				border: '#3b4252',
				borderHover: '#4c566a'
			}
		},
		{
			palette: 'contrast',
			mode: 'light',
			labelKey: () => m['settings.appearance.theme.contrast.light'](),
			colors: {
				bg: '#ffffff',
				titlebar: '#fafafa',
				dot: '#eaeaea',
				sidebar: '#fafafa',
				title: '#000000',
				body: '#666666',
				border: '#eaeaea',
				borderHover: '#d4d4d4'
			}
		},
		{
			palette: 'contrast',
			mode: 'dark',
			labelKey: () => m['settings.appearance.theme.contrast.dark'](),
			colors: {
				bg: '#000000',
				titlebar: '#0a0a0a',
				dot: '#333333',
				sidebar: '#1a1a1a',
				title: '#ededed',
				body: '#888888',
				border: '#282828',
				borderHover: '#3a3a3a'
			}
		}
	];

	let currentTheme = $state<ThemeState>(page.data.theme);
	let currentFont = $state<FontFamily>(page.data.font);
	let currentCjkFont = $state<CjkFont>(page.data.cjkFont);
	let currentCodeFont = $state<CodeFont>(page.data.codeFont);
	let currentEmojiFont = $state<EmojiFont>(page.data.emojiFont);

	const themeKey = $derived(`${currentTheme.palette}-${currentTheme.mode}`);

	const themeOptions = $derived(
		THEMES.map((t) => ({
			key: `${t.palette}-${t.mode}`,
			label: t.labelKey(),
			data: t
		}))
	);

	function selectTheme(key: string) {
		const [palette, mode] = key.split('-') as [Palette, Mode];
		const next: ThemeState = { palette, mode };
		currentTheme = next;
		applyTheme(next);
	}

	const motionOptions = $derived([
		{
			key: 'full' as const,
			label: m['settings.appearance.motion.full'](),
			aria: `${m['settings.appearance.motion.full']()} — ${m['settings.appearance.motion.full.desc']()}`
		},
		{
			key: 'reduce' as const,
			label: m['settings.appearance.motion.reduce'](),
			aria: `${m['settings.appearance.motion.reduce']()} — ${m['settings.appearance.motion.reduce.desc']()}`
		},
		{
			key: 'none' as const,
			label: m['settings.appearance.motion.none'](),
			aria: `${m['settings.appearance.motion.none']()} — ${m['settings.appearance.motion.none.desc']()}`
		}
	]);

	function selectMotion(key: string) {
		motion.set(key as MotionPreference);
	}

	const fontOptions = $derived(
		FONT_IDS.map((id) => ({
			key: id,
			label: FONTS[id].label,
			family: FONTS[id].stack
		}))
	);

	function selectFont(key: string) {
		const id = key as FontFamily;
		currentFont = id;
		applyFont(id);
	}

	const cjkOptions = $derived(
		CJK_FONT_IDS.map((id) => ({
			key: id,
			label: labelFor(id, page.data.htmlLang),
			sc: CJK_FAMILIES[id].sc,
			tc: CJK_FAMILIES[id].tc,
			jp: CJK_FAMILIES[id].jp
		}))
	);

	function selectCjk(key: string) {
		const id = key as CjkFont;
		currentCjkFont = id;
		applyCjkFont(id);
	}

	const codeOptions = $derived(
		CODE_FONT_IDS.map((id) => ({
			key: id,
			label: CODE_FONT_LABELS[id],
			family: CODE_FAMILIES[id]
		}))
	);

	function selectCode(key: string) {
		const id = key as CodeFont;
		currentCodeFont = id;
		applyCodeFont(id);
	}

	const emojiOptions = $derived(
		EMOJI_FONT_IDS.map((id) => ({
			key: id,
			label: EMOJI_FONT_LABELS[id],
			family: EMOJI_FAMILIES[id]
		}))
	);

	function selectEmoji(key: string) {
		const id = key as EmojiFont;
		currentEmojiFont = id;
		applyEmojiFont(id);
	}

	// Covers the soft-navigation case where the SSR chunk already shipped the
	// full font set for /settings — this is a no-op — and the case where the
	// user landed on another route first and is now switching into /settings
	// via client routing, so the extra faces need to be pulled in.
	$effect(() => {
		ensureAllFontsLoaded();
		ensureAllCjkLoaded();
		ensureAllCodeLoaded();
		ensureAllEmojiLoaded();
	});
</script>

<SettingSection
	id="general"
	title={m['settings.tab.general']()}
	description={m['settings.tab.general.desc']()}
>
	<p class="text-sm text-muted-foreground">{m['settings.tab.general.wip']()}</p>
</SettingSection>

<hr class="mb-10 border-t border-dashed border-divider" />

<SettingSection
	id="appearance"
	title={m['settings.tab.appearance']()}
	description={m['settings.tab.appearance.desc']()}
>
	<div class="space-y-10">
		<SettingSection
			id="appearance-theme"
			title={m['settings.appearance.theme']()}
			description={m['settings.appearance.theme.desc']()}
			level={3}
		>
			<!-- Column-first flow at 3×2 keeps lights on the top row and darks on the
			    bottom so each column is a light/dark pair. At sm+ it collapses back
			    to a single 6-col row, so grid-flow-row preserves the source order. -->
			<SettingOptions
				value={themeKey}
				onValueChange={selectTheme}
				options={themeOptions}
				layout="custom"
				class="grid max-w-104 grid-flow-col grid-cols-3 grid-rows-2 gap-3 sm:max-w-212 sm:grid-flow-row sm:grid-cols-6 sm:grid-rows-1 sm:gap-4"
				ariaLabelledby="appearance-theme-title"
				ariaDescribedby="appearance-theme-desc"
			>
				{#snippet card({ option, props, pressed })}
					{@const data = themeOptions.find((o) => o.key === option.key)?.data}
					{#if data}
						<ThemeCard
							label={option.label}
							active={pressed}
							buttonProps={props}
							colors={data.colors}
						/>
					{/if}
				{/snippet}
			</SettingOptions>
		</SettingSection>

		<SettingSection
			id="appearance-motion"
			title={m['settings.appearance.motion']()}
			description={m['settings.appearance.motion.desc']()}
			level={3}
		>
			<SettingOptions
				value={motion.value}
				onValueChange={selectMotion}
				options={motionOptions}
				layout="wrap"
				cols={{ base: 3 }}
				ariaLabelledby="appearance-motion-title"
				ariaDescribedby="appearance-motion-desc"
			>
				{#snippet card({ option, props, pressed })}
					<WindowCard
						label={option.label}
						active={pressed}
						buttonProps={props}
						{...MOTION_WINDOW}
						attrs={{ 'data-motion-exempt': '' }}
					>
						<!-- Two views alternate: each has its own sidebar with a different
						     nav item highlighted + a different body list. Mirrors the
						     actual sidebar-tab-switch interaction this settings page
						     itself uses. Active card loops forever via inline keyframe
						     `animation`. Inactive cards rely on CSS transitions scoped
						     by `.motion-tier-*` in `utilities.css` — hover flips A↔B,
						     hover-out tweens back. -->
						<div class={`motion-tier-${option.key} relative h-full`}>
							<!-- View A/B colors read live from the root palette (foreground,
							     border, muted-foreground) so previews track the active theme. -->
							<div
								class="motion-layer motion-layer-a absolute inset-0 flex gap-2.5"
								style={pressed
									? `animation: motion-state-a-${option.key} 5s ease-in-out infinite`
									: ''}
							>
								<div class="w-5 shrink-0 space-y-1">
									<div class="h-1 w-full rounded-sm bg-foreground"></div>
									<div class="h-1 w-3/5 rounded-sm bg-border"></div>
									<div class="h-1 w-4/5 rounded-sm bg-border"></div>
								</div>
								<div class="flex-1 space-y-1">
									<div class="h-1.5 w-2/5 rounded-sm bg-foreground"></div>
									<div class="h-1 w-3/4 rounded-sm bg-muted-foreground"></div>
									<div class="h-1 w-1/2 rounded-sm bg-muted-foreground"></div>
									<div class="h-1 w-2/3 rounded-sm bg-muted-foreground"></div>
								</div>
							</div>
							<div
								class="motion-layer motion-layer-b absolute inset-0 flex gap-2.5"
								style={pressed
									? `animation: motion-state-b-${option.key} 5s ease-in-out infinite`
									: ''}
							>
								<div class="w-5 shrink-0 space-y-1">
									<div class="h-1 w-full rounded-sm bg-border"></div>
									<div class="h-1 w-3/5 rounded-sm bg-foreground"></div>
									<div class="h-1 w-4/5 rounded-sm bg-border"></div>
								</div>
								<div class="flex-1 space-y-1">
									<div class="h-1.5 w-3/5 rounded-sm bg-foreground"></div>
									<div class="h-1 w-5/6 rounded-sm bg-muted-foreground"></div>
									<div class="h-1 w-3/5 rounded-sm bg-muted-foreground"></div>
									<div class="h-1 w-1/2 rounded-sm bg-muted-foreground"></div>
								</div>
							</div>
						</div>
					</WindowCard>
				{/snippet}
			</SettingOptions>
		</SettingSection>
	</div>
</SettingSection>

<hr class="mb-10 border-t border-dashed border-divider" />

<SettingSection
	id="typography"
	title={m['settings.tab.typography']()}
	description={m['settings.tab.typography.desc']()}
>
	<div class="space-y-10">
		<SettingSection
			id="typography-font"
			title={m['settings.appearance.font']()}
			description={m['settings.appearance.font.desc']()}
			level={3}
		>
			<SettingOptions
				value={currentFont}
				onValueChange={selectFont}
				options={fontOptions}
				layout="scroll"
				cols={{ base: 3, sm: 4 }}
				ariaLabelledby="typography-font-title"
				ariaDescribedby="typography-font-desc"
			>
				{#snippet card({ option, props, pressed })}
					{@const family = fontOptions.find((o) => o.key === option.key)?.family ?? ''}
					<SampleCard
						variant="font"
						label={option.label}
						{family}
						active={pressed}
						buttonProps={props}
					/>
				{/snippet}
			</SettingOptions>
		</SettingSection>

		<SettingSection
			id="typography-cjk"
			title={m['settings.appearance.font.cjk']()}
			description={m['settings.appearance.font.cjk.desc']()}
			level={3}
		>
			<SettingOptions
				value={currentCjkFont}
				onValueChange={selectCjk}
				options={cjkOptions}
				layout="scroll"
				cols={{ base: 3 }}
				ariaLabelledby="typography-cjk-title"
				ariaDescribedby="typography-cjk-desc"
			>
				{#snippet card({ option, props, pressed })}
					{@const data = cjkOptions.find((o) => o.key === option.key)}
					{#if data}
						<SampleCard
							variant="cjk"
							label={option.label}
							sc={data.sc}
							tc={data.tc}
							jp={data.jp}
							active={pressed}
							buttonProps={props}
						/>
					{/if}
				{/snippet}
			</SettingOptions>
		</SettingSection>

		<SettingSection
			id="typography-code"
			title={m['settings.appearance.code.font']()}
			description={m['settings.appearance.code.font.desc']()}
			level={3}
		>
			<SettingOptions
				value={currentCodeFont}
				onValueChange={selectCode}
				options={codeOptions}
				layout="scroll"
				cols={{ base: 3, sm: 4 }}
				ariaLabelledby="typography-code-title"
				ariaDescribedby="typography-code-desc"
			>
				{#snippet card({ option, props, pressed })}
					{@const family = codeOptions.find((o) => o.key === option.key)?.family ?? ''}
					<SampleCard
						variant="code"
						label={option.label}
						{family}
						active={pressed}
						buttonProps={props}
					/>
				{/snippet}
			</SettingOptions>
		</SettingSection>

		<SettingSection
			id="typography-emoji"
			title={m['settings.appearance.emoji']()}
			description={m['settings.appearance.emoji.desc']()}
			level={3}
		>
			<SettingOptions
				value={currentEmojiFont}
				onValueChange={selectEmoji}
				options={emojiOptions}
				layout="scroll"
				cols={{ base: 3 }}
				ariaLabelledby="typography-emoji-title"
				ariaDescribedby="typography-emoji-desc"
			>
				{#snippet card({ option, props, pressed })}
					{@const family = emojiOptions.find((o) => o.key === option.key)?.family ?? ''}
					<SampleCard
						variant="emoji"
						label={option.label}
						{family}
						active={pressed}
						buttonProps={props}
					/>
				{/snippet}
			</SettingOptions>
		</SettingSection>
	</div>
</SettingSection>

<hr class="mb-10 border-t border-dashed border-divider" />

<SettingSection
	id="account"
	title={m['settings.tab.account']()}
	description={m['settings.tab.account.desc']()}
>
	<p class="text-sm text-muted-foreground">{m['settings.tab.account.wip']()}</p>
</SettingSection>

<hr class="mb-10 border-t border-dashed border-divider" />

<SettingSection
	id="privacy"
	title={m['settings.tab.privacy']()}
	description={m['settings.tab.privacy.desc']()}
>
	<p class="text-sm text-muted-foreground">{m['settings.tab.privacy.wip']()}</p>
</SettingSection>
