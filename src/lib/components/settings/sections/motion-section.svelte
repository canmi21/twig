<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import type { MotionPreference } from '$lib/motion/script';
	import WindowCard from '$lib/components/cards/window-card.svelte';
	import SettingSection from '$lib/components/settings/setting-section.svelte';
	import SettingOptions from '$lib/components/settings/setting-options.svelte';

	// Preview chrome uses CSS tokens (not palette literals) so the Motion card
	// tracks the active theme — unlike ThemeCard, which self-represents each
	// palette it previews.
	const MOTION_WINDOW = {
		bg: 'var(--color-background)',
		titlebar: 'var(--color-muted)',
		dot: 'var(--color-muted-foreground)',
		border: 'var(--color-border)',
		borderHover: 'var(--color-muted-foreground)'
	};

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
</script>

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
						style={pressed ? `animation: motion-state-a-${option.key} 5s ease-in-out infinite` : ''}
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
						style={pressed ? `animation: motion-state-b-${option.key} 5s ease-in-out infinite` : ''}
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
