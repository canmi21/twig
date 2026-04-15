<script lang="ts">
	import { resolve } from '$app/paths';

	import { m } from '$lib/paraglide/messages';

	import GitHub from '$lib/icons/github.svelte';
	import Bluesky from '$lib/icons/bluesky.svelte';
	import Telegram from '$lib/icons/telegram.svelte';
	import Nyaone from '$lib/icons/nyaone.svelte';

	import IconSocialX from '~icons/mingcute/social-x-line';
	import IconTrain from '~icons/mingcute/train-2-fill';
	import IconPlanet from '~icons/mingcute/planet-line';
	import IconRss from '~icons/mingcute/rss-2-fill';

	import Fa from 'svelte-fa';
	import { faMap } from '@fortawesome/free-solid-svg-icons';

	const iconContainer =
		'inline-flex size-4 shrink-0 items-center justify-center hover:text-foreground focus-visible:text-foreground focus-visible:outline-none';
</script>

<div class="flex flex-wrap items-center gap-4 text-muted-foreground">
	<a
		href="https://github.com/canmi21"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'GitHub' })}
		class={iconContainer}
	>
		<GitHub class="size-4 flex-none" />
	</a>
	<a
		href="https://twitter.com/intent/follow?screen_name=canmi21"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'X (Twitter)' })}
		class={iconContainer}
	>
		<IconSocialX class="h-5 w-auto flex-none" />
	</a>
	<a
		href="https://nya.one/@canmi"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'NyaOne' })}
		class={iconContainer}
	>
		<Nyaone class="size-4 flex-none" />
	</a>
	<a
		href="https://bsky.app/profile/canmi.net"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'BlueSky' })}
		class={iconContainer}
	>
		<Bluesky class="size-4 flex-none" />
	</a>
	<a
		href="https://t.me/canmi21"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'Telegram' })}
		class={iconContainer}
	>
		<Telegram class="h-3.75 w-auto flex-none" />
	</a>
	<a
		href={resolve('/sitemap.xml')}
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'Sitemap' })}
		class={iconContainer}
	>
		<Fa icon={faMap} class="h-4 w-auto flex-none" />
	</a>
	<a
		href="https://www.travellings.cn/go.html"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'Travellings' })}
		class={iconContainer}
	>
		<IconTrain class="h-4.75 w-auto flex-none" />
	</a>
	<a
		href="https://travel.moe/go?travel=on"
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'Moe Travel' })}
		class="{iconContainer} footer-icon-bold"
	>
		<IconPlanet class="h-4.75 w-auto flex-none" />
	</a>
	<a
		href={resolve('/feed')}
		target="_blank"
		rel="noopener noreferrer"
		aria-label={m['footer.link.visit']({ service: 'RSS' })}
		class={iconContainer}
	>
		<IconRss class="h-4.5 w-auto flex-none" />
	</a>
</div>
