<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import { applyTheme, type Mode, type Palette, type ThemeState } from '$lib/theme/script';
	import ThemeCard from '$lib/components/cards/theme-card.svelte';
	import WindowCard from '$lib/components/cards/window-card.svelte';
	import SampleCard from '$lib/components/cards/sample-card.svelte';

	const MOTION_WINDOW = {
		bg: '#171717',
		titlebar: '#262626',
		dot: '#525252',
		border: '#404040',
		borderHover: '#525252'
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

	const THEMES: {
		palette: Palette;
		mode: Mode;
		label: string;
		colors: PaletteColors;
	}[] = [
		{
			palette: 'neutral',
			mode: 'light',
			label: 'Chalk White',
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
			label: 'Charcoal Black',
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
			label: 'Snow Storm',
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
			label: 'Polar Night',
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
			label: 'Pearl White',
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
			label: 'Obsidian Black',
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

	const FONTS = [
		{ name: 'System', family: 'system-ui, sans-serif' },
		{ name: 'Inter', family: 'Inter, sans-serif' },
		{ name: 'Roboto', family: 'Roboto, sans-serif' },
		{ name: 'Source Sans', family: '"Source Sans 3", sans-serif' }
	];

	const CJK_FONTS = [
		{ name: 'System', sc: 'system-ui', tc: 'system-ui', jp: 'system-ui' },
		{ name: 'Noto Sans', sc: '"Noto Sans SC"', tc: '"Noto Sans TC"', jp: '"Noto Sans JP"' },
		{ name: 'LXGW WenKai', sc: '"LXGW WenKai"', tc: '"LXGW WenKai TC"', jp: '"LXGW WenKai"' }
	];

	const CODE_FONTS = [
		{ name: 'Monospace', family: 'monospace' },
		{ name: 'Maple Mono', family: '"Maple Mono", monospace' },
		{ name: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
		{ name: 'Fira Code', family: '"Fira Code", monospace' }
	];

	const EMOJIS = [
		{ name: 'System', kind: 'native' as const },
		{ name: 'Twemoji', kind: 'twemoji' as const },
		{ name: 'Noto Emoji', kind: 'noto' as const },
		{ name: 'Fluent Emoji', kind: 'fluent' as const }
	];

	let currentTheme = $state<ThemeState>(page.data.theme);

	function selectTheme(next: ThemeState) {
		currentTheme = next;
		applyTheme(next);
	}
</script>

<!-- General -->
<div id="general" class="mb-10 scroll-mt-6 lg:scroll-mt-20">
	<h2 class="mb-4 text-base font-semibold text-foreground">{m['settings.tab.general']()}</h2>
	<p class="text-sm text-muted-foreground">General settings will go here.</p>
</div>

<!-- Appearance -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="appearance" class="mb-10 space-y-10 scroll-mt-6 lg:scroll-mt-20">
	<h2 class="mb-4 text-base font-semibold text-foreground">{m['settings.tab.appearance']()}</h2>
	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.theme']()}</h3>
		<!-- Column-first flow at 3×2 keeps lights on the top row and darks on the
		    bottom so each column is a light/dark pair. At sm+ it collapses back
		    to a single 6-col row, so grid-flow-row preserves the source order. -->
		<div
			class="grid max-w-104 grid-flow-col grid-cols-3 grid-rows-2 gap-3 sm:max-w-212 sm:grid-flow-row sm:grid-cols-6 sm:grid-rows-1 sm:gap-4"
		>
			{#each THEMES as theme (`${theme.palette}-${theme.mode}`)}
				<ThemeCard
					label={theme.label}
					active={currentTheme.palette === theme.palette && currentTheme.mode === theme.mode}
					onclick={() => selectTheme({ mode: theme.mode, palette: theme.palette })}
					colors={theme.colors}
				/>
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.motion']()}</h3>

		{#snippet motionBody(tier: 'full' | 'reduce' | 'none', active: boolean)}
			<!-- Two views alternate: each has its own sidebar with a different nav
			     item highlighted + a different body list. Mirrors the actual
			     sidebar-tab-switch interaction this settings page itself uses.
			     Active card loops forever via inline keyframe `animation`.
			     Inactive cards rely on CSS transitions scoped by `.motion-tier-*`
			     in `utilities.css` — hover flips A↔B, hover-out tweens back. -->
			<div class={`motion-tier-${tier} relative h-full`}>
				<!-- View A: nav item 1 active -->
				<div
					class="motion-layer motion-layer-a absolute inset-0 flex gap-2.5"
					style={active ? `animation: motion-state-a-${tier} 5s ease-in-out infinite` : ''}
				>
					<div class="w-5 shrink-0 space-y-1">
						<div class="h-1 w-full rounded-sm" style="background:#d4d4d4"></div>
						<div class="h-1 w-3/5 rounded-sm" style="background:#404040"></div>
						<div class="h-1 w-4/5 rounded-sm" style="background:#404040"></div>
					</div>
					<div class="flex-1 space-y-1">
						<div class="h-1.5 w-2/5 rounded-sm" style="background:#d4d4d4"></div>
						<div class="h-1 w-3/4 rounded-sm" style="background:#525252"></div>
						<div class="h-1 w-1/2 rounded-sm" style="background:#525252"></div>
						<div class="h-1 w-2/3 rounded-sm" style="background:#525252"></div>
					</div>
				</div>
				<!-- View B: nav item 2 active -->
				<div
					class="motion-layer motion-layer-b absolute inset-0 flex gap-2.5"
					style={active ? `animation: motion-state-b-${tier} 5s ease-in-out infinite` : ''}
				>
					<div class="w-5 shrink-0 space-y-1">
						<div class="h-1 w-full rounded-sm" style="background:#404040"></div>
						<div class="h-1 w-3/5 rounded-sm" style="background:#d4d4d4"></div>
						<div class="h-1 w-4/5 rounded-sm" style="background:#404040"></div>
					</div>
					<div class="flex-1 space-y-1">
						<div class="h-1.5 w-3/5 rounded-sm" style="background:#d4d4d4"></div>
						<div class="h-1 w-5/6 rounded-sm" style="background:#525252"></div>
						<div class="h-1 w-3/5 rounded-sm" style="background:#525252"></div>
						<div class="h-1 w-1/2 rounded-sm" style="background:#525252"></div>
					</div>
				</div>
			</div>
		{/snippet}

		<div class="grid max-w-104 grid-cols-3 gap-3 sm:gap-4">
			<WindowCard
				label={m['settings.appearance.motion.full']()}
				active={motion.value === 'full'}
				onclick={() => motion.set('full')}
				{...MOTION_WINDOW}
				attrs={{ 'data-motion-exempt': '' }}
			>
				{@render motionBody('full', motion.value === 'full')}
			</WindowCard>

			<WindowCard
				label={m['settings.appearance.motion.reduce']()}
				active={motion.value === 'reduce'}
				onclick={() => motion.set('reduce')}
				{...MOTION_WINDOW}
				attrs={{ 'data-motion-exempt': '' }}
			>
				{@render motionBody('reduce', motion.value === 'reduce')}
			</WindowCard>

			<WindowCard
				label={m['settings.appearance.motion.none']()}
				active={motion.value === 'none'}
				onclick={() => motion.set('none')}
				{...MOTION_WINDOW}
				attrs={{ 'data-motion-exempt': '' }}
			>
				{@render motionBody('none', motion.value === 'none')}
			</WindowCard>
		</div>
	</section>
</div>

<!-- Typography -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="typography" class="mb-10 space-y-10 scroll-mt-6 lg:scroll-mt-20">
	<h2 class="mb-4 text-base font-semibold text-foreground">{m['settings.tab.typography']()}</h2>
	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.font']()}</h3>
		<div class="flex flex-wrap gap-4">
			{#each FONTS as font (font.name)}
				<SampleCard variant="font" label={font.name} family={font.family} />
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">
			{m['settings.appearance.font.cjk']()}
		</h3>
		<div class="flex flex-wrap gap-4">
			{#each CJK_FONTS as font (font.name)}
				<SampleCard variant="cjk" label={font.name} sc={font.sc} tc={font.tc} jp={font.jp} />
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">
			{m['settings.appearance.code.font']()}
		</h3>
		<div class="flex flex-wrap gap-4">
			{#each CODE_FONTS as font (font.name)}
				<SampleCard variant="code" label={font.name} family={font.family} />
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.emoji']()}</h3>
		<div class="flex flex-wrap gap-4">
			{#each EMOJIS as emoji (emoji.name)}
				<SampleCard variant="emoji" label={emoji.name} kind={emoji.kind} />
			{/each}
		</div>
	</section>
</div>

<!-- Account -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="account" class="mb-10 scroll-mt-6 lg:scroll-mt-20">
	<h2 class="mb-4 text-base font-semibold text-foreground">{m['settings.tab.account']()}</h2>
	<p class="text-sm text-muted-foreground">Account settings will go here.</p>
</div>

<!-- Privacy -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="privacy" class="mb-10 scroll-mt-6 lg:scroll-mt-20">
	<h2 class="mb-4 text-base font-semibold text-foreground">{m['settings.tab.privacy']()}</h2>
	<p class="text-sm text-muted-foreground">Privacy settings will go here.</p>
</div>
