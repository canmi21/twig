<script lang="ts">
	import type { Component } from 'svelte';
	import { resolve } from '$app/paths';

	import { m } from '$lib/paraglide/messages';

	import GitHub from '$lib/icons/github.svelte';
	import Bluesky from '$lib/icons/bluesky.svelte';
	import Telegram from '$lib/icons/telegram.svelte';
	import Nyaone from '$lib/icons/nyaone.svelte';
	import Sitemap from '$lib/icons/sitemap.svelte';

	import IconSocialX from '~icons/mingcute/social-x-line';
	import IconTrain from '~icons/mingcute/train-2-fill';
	import IconPlanet from '~icons/mingcute/planet-line';
	import IconRss from '~icons/mingcute/rss-2-fill';

	type Link = {
		service: string;
		href: string;
		Icon: Component<{ class?: string }>;
		iconClass: string;
		extraClass?: string;
	};

	const iconContainer =
		'focus-ring inline-flex size-4 shrink-0 items-center justify-center hover:text-foreground focus-visible:text-foreground';

	const LINKS: Link[] = [
		{
			service: 'GitHub',
			href: 'https://github.com/canmi21',
			Icon: GitHub,
			iconClass: 'size-4 flex-none'
		},
		{
			service: 'X (Twitter)',
			href: 'https://twitter.com/intent/follow?screen_name=canmi21',
			Icon: IconSocialX,
			iconClass: 'h-5 w-auto flex-none'
		},
		{
			service: 'NyaOne',
			href: 'https://nya.one/@canmi',
			Icon: Nyaone,
			iconClass: 'size-4 flex-none'
		},
		{
			service: 'BlueSky',
			href: 'https://bsky.app/profile/canmi.net',
			Icon: Bluesky,
			iconClass: 'size-4 flex-none'
		},
		{
			service: 'Telegram',
			href: 'https://t.me/canmi21',
			Icon: Telegram,
			iconClass: 'h-3.75 w-auto flex-none'
		},
		{
			service: 'Sitemap',
			href: resolve('/sitemap.xml'),
			Icon: Sitemap,
			iconClass: 'h-4 w-auto flex-none'
		},
		{
			service: 'Travellings',
			href: 'https://www.travellings.cn/go.html',
			Icon: IconTrain,
			iconClass: 'h-4.75 w-auto flex-none'
		},
		{
			service: 'Moe Travel',
			href: 'https://travel.moe/go?travel=on',
			Icon: IconPlanet,
			iconClass: 'h-4.75 w-auto flex-none',
			extraClass: 'footer-icon-bold'
		},
		{
			service: 'RSS',
			href: resolve('/feed'),
			Icon: IconRss,
			iconClass: 'h-4.5 w-auto flex-none'
		}
	];
</script>

<div class="flex flex-wrap items-center gap-4 text-muted-foreground">
	<!-- Data-driven external link list — svelte/no-navigation-without-resolve
	     can't statically prove each href in an each-loop, but every entry in
	     LINKS above is typed and curated. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	{#each LINKS as { service, href, Icon, iconClass, extraClass } (service)}
		<a
			{href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={m['footer.link.visit']({ service })}
			class="{iconContainer} {extraClass ?? ''}"
		>
			<Icon class={iconClass} />
		</a>
	{/each}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</div>
