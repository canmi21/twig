<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import { applyTheme, type Theme } from '$lib/theme/script';
	import ThemeCard from '$lib/components/theme-card.svelte';
	import WindowCard from '$lib/components/window-card.svelte';
	import Hash from '@lucide/svelte/icons/hash';

	const MOTION_WINDOW = {
		bg: '#171717',
		titlebar: '#262626',
		dot: '#525252',
		border: '#404040',
		borderHover: '#525252'
	};

	const THEMES = [
		{
			id: 'light',
			label: 'Light',
			selectable: true,
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
			id: 'dark',
			label: 'Dark',
			selectable: true,
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
			id: 'nord',
			label: 'Nord',
			selectable: false,
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
			id: 'black',
			label: 'Black',
			selectable: false,
			colors: {
				bg: '#000',
				titlebar: '#0a0a0a',
				dot: '#333',
				sidebar: '#1a1a1a',
				title: '#ededed',
				body: '#333',
				border: '#282828',
				borderHover: '#3a3a3a'
			}
		}
	];

	function copyAnchor(id: string) {
		history.replaceState(null, '', `/settings#${id}`);
	}

	let currentTheme = $state<Theme>(page.data.theme);

	function selectTheme(theme: Theme) {
		currentTheme = theme;
		applyTheme(theme);
	}
</script>

<!-- General -->
<div id="general" class="mb-10">
	<h2 class="group/title relative mb-4 text-base font-semibold text-foreground">
		<button
			onclick={() => copyAnchor('general')}
			class="focus-ring absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100"
			aria-label="Copy link"
		>
			<Hash class="size-3.5 text-muted-foreground" />
		</button>
		{m['settings.tab.general']()}
	</h2>
	<p class="text-sm text-muted-foreground">General settings will go here.</p>
</div>

<!-- Appearance -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="appearance" class="mb-10 space-y-10">
	<h2 class="group/title relative mb-4 text-base font-semibold text-foreground">
		<button
			onclick={() => copyAnchor('appearance')}
			class="focus-ring absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100"
			aria-label="Copy link"
		>
			<Hash class="size-3.5 text-muted-foreground" />
		</button>
		{m['settings.tab.appearance']()}
	</h2>
	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.theme']()}</h3>
		<div class="grid max-w-136 grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
			{#each THEMES as theme (theme.id)}
				<ThemeCard
					label={theme.label}
					active={currentTheme === theme.id}
					onclick={theme.selectable ? () => selectTheme(theme.id as Theme) : undefined}
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
<div id="typography" class="mb-10 space-y-10">
	<h2 class="group/title relative mb-4 text-base font-semibold text-foreground">
		<button
			onclick={() => copyAnchor('typography')}
			class="focus-ring absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100"
			aria-label="Copy link"
		>
			<Hash class="size-3.5 text-muted-foreground" />
		</button>
		{m['settings.tab.typography']()}
	</h2>
	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.font']()}</h3>
		<div class="flex flex-wrap gap-4">
			{#each [{ name: 'System', family: 'system-ui, sans-serif', sample: 'Aa' }, { name: 'Inter', family: 'Inter, sans-serif', sample: 'Aa' }, { name: 'Roboto', family: 'Roboto, sans-serif', sample: 'Aa' }, { name: 'Source Sans', family: '"Source Sans 3", sans-serif', sample: 'Aa' }] as font (font.name)}
				<button class="group focus-ring flex flex-col items-center gap-2 cursor-default">
					<div
						class="flex h-23.5 w-31 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-border hover:border-muted-foreground/50"
					>
						<span class="text-3xl text-foreground/80" style="font-family: {font.family}"
							>{font.sample}</span
						>
						<span
							class="mt-1 w-full truncate px-2 text-center text-[0.6rem] text-muted-foreground"
							style="font-family: {font.family}">The quick brown fox</span
						>
					</div>
					<span class="text-xs text-muted-foreground">{font.name}</span>
				</button>
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">
			{m['settings.appearance.font.cjk']()}
		</h3>
		<div class="flex flex-wrap gap-4">
			{#each [{ name: 'System', sc: 'system-ui', tc: 'system-ui', jp: 'system-ui' }, { name: 'Noto Sans', sc: '"Noto Sans SC"', tc: '"Noto Sans TC"', jp: '"Noto Sans JP"' }, { name: 'LXGW WenKai', sc: '"LXGW WenKai"', tc: '"LXGW WenKai TC"', jp: '"LXGW WenKai"' }] as font (font.name)}
				<button class="group focus-ring flex flex-col items-center gap-2 cursor-default">
					<div
						class="flex h-23.5 w-31 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-border hover:border-muted-foreground/50"
					>
						<span
							class="text-3xl text-foreground/80"
							style="font-family: {font.sc}, {font.tc}, {font.jp}, serif"
							>{m['settings.appearance.font.cjk.preview']()}</span
						>
						<span
							class="mt-1 w-full truncate px-2 text-center text-[0.6rem] text-muted-foreground"
							style="font-family: {font.sc}, {font.tc}, {font.jp}, serif"
							>{m['settings.appearance.font.cjk.sample']()}</span
						>
					</div>
					<span class="text-xs text-muted-foreground">{font.name}</span>
				</button>
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">
			{m['settings.appearance.code.font']()}
		</h3>
		<div class="flex flex-wrap gap-4">
			{#each [{ name: 'Monospace', family: 'monospace' }, { name: 'Maple Mono', family: '"Maple Mono", monospace' }, { name: 'JetBrains Mono', family: '"JetBrains Mono", monospace' }, { name: 'Fira Code', family: '"Fira Code", monospace' }] as font (font.name)}
				<button class="group focus-ring flex flex-col items-center gap-2 cursor-default">
					<div
						class="flex h-23.5 w-31 flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-border hover:border-muted-foreground/50"
					>
						<span class="text-2xl text-foreground/80" style="font-family: {font.family}">=&gt;</span
						>
						<span
							class="mt-1 w-full truncate px-2 text-center text-[0.55rem] text-muted-foreground"
							style="font-family: {font.family}">fn main() {'{'} 0 }</span
						>
					</div>
					<span class="text-xs text-muted-foreground">{font.name}</span>
				</button>
			{/each}
		</div>
	</section>

	<section>
		<h3 class="mb-4 text-sm font-semibold text-foreground">{m['settings.appearance.emoji']()}</h3>
		<div class="flex flex-wrap gap-4">
			{#each [{ name: 'System', type: 'native' }, { name: 'Twemoji', type: 'svg', base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/' }, { name: 'Noto Emoji', type: 'svg', base: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/' }, { name: 'Fluent Emoji', type: 'svg', base: 'https://cdn.jsdelivr.net/gh/user/fluentui-emoji@main/assets/' }] as emoji (emoji.name)}
				<button class="group focus-ring flex flex-col items-center gap-2 cursor-default">
					<div
						class="flex h-23.5 w-31 items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-border hover:border-muted-foreground/50"
					>
						{#if emoji.type === 'native'}
							<span class="text-[1.75rem] leading-none">😊</span>
							<span class="text-[1.75rem] leading-none">🔥</span>
							<span class="text-[1.75rem] leading-none">🎉</span>
						{:else if emoji.name === 'Twemoji'}
							<img src="{emoji.base}1f60a.svg" alt="😊" class="size-7" />
							<img src="{emoji.base}1f525.svg" alt="🔥" class="size-7" />
							<img src="{emoji.base}1f389.svg" alt="🎉" class="size-7" />
						{:else if emoji.name === 'Noto Emoji'}
							<img src="{emoji.base}emoji_u1f60a.svg" alt="😊" class="size-7" />
							<img src="{emoji.base}emoji_u1f525.svg" alt="🔥" class="size-7" />
							<img src="{emoji.base}emoji_u1f389.svg" alt="🎉" class="size-7" />
						{:else if emoji.name === 'Fluent Emoji'}
							<img
								src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20face%20with%20smiling%20eyes/3D/smiling_face_with_smiling_eyes_3d.png"
								alt="😊"
								class="size-7"
							/>
							<img
								src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png"
								alt="🔥"
								class="size-7"
							/>
							<img
								src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Party%20popper/3D/party_popper_3d.png"
								alt="🎉"
								class="size-7"
							/>
						{/if}
					</div>
					<span class="text-xs text-muted-foreground">{emoji.name}</span>
				</button>
			{/each}
		</div>
	</section>
</div>

<!-- Account -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="account" class="mb-10">
	<h2 class="group/title relative mb-4 text-base font-semibold text-foreground">
		<button
			onclick={() => copyAnchor('account')}
			class="focus-ring absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100"
			aria-label="Copy link"
		>
			<Hash class="size-3.5 text-muted-foreground" />
		</button>
		{m['settings.tab.account']()}
	</h2>
	<p class="text-sm text-muted-foreground">Account settings will go here.</p>
</div>

<!-- Privacy -->
<hr class="mb-10 border-t border-dashed border-divider" />
<div id="privacy" class="mb-10">
	<h2 class="group/title relative mb-4 text-base font-semibold text-foreground">
		<button
			onclick={() => copyAnchor('privacy')}
			class="focus-ring absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100"
			aria-label="Copy link"
		>
			<Hash class="size-3.5 text-muted-foreground" />
		</button>
		{m['settings.tab.privacy']()}
	</h2>
	<p class="text-sm text-muted-foreground">Privacy settings will go here.</p>
</div>
