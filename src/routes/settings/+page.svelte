<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { ensureAllFontsLoaded } from '$lib/font/client';
	import { ensureAllCjkLoaded } from '$lib/font/cjk-client';
	import { ensureAllCodeLoaded } from '$lib/font/code-client';
	import { ensureAllEmojiLoaded } from '$lib/font/emoji-client';
	import ThemeSection from '$lib/components/settings/sections/theme-section.svelte';
	import MotionSection from '$lib/components/settings/sections/motion-section.svelte';
	import FontSection from '$lib/components/settings/sections/font-section.svelte';
	import CjkFontSection from '$lib/components/settings/sections/cjk-font-section.svelte';
	import CodeFontSection from '$lib/components/settings/sections/code-font-section.svelte';
	import EmojiFontSection from '$lib/components/settings/sections/emoji-font-section.svelte';

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

<!-- Top-level anchors (#general, #appearance, #typography) land on the divider
     or the page top; only level-3 sections render a visible header. -->
<div id="general" class="mb-10 scroll-mt-6 lg:scroll-mt-20">
	<p class="text-sm text-muted-foreground">{m['settings.tab.general.wip']()}</p>
</div>

<hr
	id="appearance"
	class="mb-10 scroll-mt-6 border-t border-dashed border-divider lg:scroll-mt-20"
/>

<div class="mb-10 space-y-10">
	<ThemeSection />
	<MotionSection />
</div>

<hr
	id="typography"
	class="mb-10 scroll-mt-6 border-t border-dashed border-divider lg:scroll-mt-20"
/>

<div class="space-y-10">
	<FontSection />
	<CjkFontSection />
	<CodeFontSection />
	<EmojiFontSection />
</div>
