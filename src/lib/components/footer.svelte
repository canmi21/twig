<script lang="ts">
	import GitHub from '$lib/icons/github.svelte';
	import Bluesky from '$lib/icons/bluesky.svelte';
	import Telegram from '$lib/icons/telegram.svelte';
	import Nyaone from '$lib/icons/nyaone.svelte';

	import IconSocialX from '~icons/mingcute/social-x-line';
	import IconTrain from '~icons/mingcute/train-2-fill';
	import IconPlanet from '~icons/mingcute/planet-line';
	import IconRss from '~icons/mingcute/rss-2-fill';

	import GitMerge from '@lucide/svelte/icons/git-merge';
	import Lollipop from '@lucide/svelte/icons/lollipop';

	import Fa from 'svelte-fa';
	import { faMap } from '@fortawesome/free-solid-svg-icons';

	let { runtimeDays }: { runtimeDays: number } = $props();

	const accountName = 'Canmi';
	const presenceCount = 1;
	const copyrightYear = 2026;
	const repoUrl = 'https://github.com/canmi21/taki';
	const commitHash = __APP_GIT_COMMIT__;
	const shortHash = commitHash.slice(0, 7);

	const iconContainer =
		'inline-flex size-4 shrink-0 items-center justify-center hover:text-foreground';
</script>

<footer class="border-t border-divider">
	<div class="px-5 py-3">
		<div class="mx-auto w-full px-3 sm:px-6">
			<div class="min-w-0 pt-4 text-foreground/72">
				<div class="text-xl font-semibold text-foreground">Hi, {accountName}</div>
				<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<span>小站已经活了 {runtimeDays} 天</span>
					<span>{presenceCount} 位小伙伴正在浏览呢</span>
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-4 text-muted-foreground">
					<a
						href="https://github.com/canmi21"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="GitHub"
						class={iconContainer}
					>
						<GitHub class="size-4 flex-none" />
					</a>
					<a
						href="https://twitter.com/intent/follow?screen_name=canmi21"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="X"
						class={iconContainer}
					>
						<IconSocialX class="h-5 w-auto flex-none" />
					</a>
					<a
						href="https://nya.one/@canmi"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Nyaone"
						class={iconContainer}
					>
						<Nyaone class="size-4 flex-none" />
					</a>
					<a
						href="https://bsky.app/profile/canmi.net"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Bluesky"
						class={iconContainer}
					>
						<Bluesky class="size-4 flex-none" />
					</a>
					<a
						href="https://t.me/canmi21"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Telegram"
						class={iconContainer}
					>
						<Telegram class="h-3.75 w-auto flex-none" />
					</a>
					<a
						href="/sitemap.xml"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Sitemap"
						class={iconContainer}
					>
						<Fa icon={faMap} class="h-4 w-auto flex-none" />
					</a>
					<a
						href="https://www.travellings.cn/go.html"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Travellings"
						class={iconContainer}
					>
						<IconTrain class="h-4.75 w-auto flex-none" />
					</a>
					<a
						href="https://travel.moe/go?travel=on"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="TravelMoe"
						class="{iconContainer} footer-icon-bold"
					>
						<IconPlanet class="h-4.75 w-auto flex-none" />
					</a>
					<a
						href="/feed.xml"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="RSS"
						class={iconContainer}
					>
						<IconRss class="h-4.5 w-auto flex-none" />
					</a>
				</div>
			</div>
		</div>
	</div>

	<div class="px-5 pb-3">
		<div class="mx-3 border-t border-dashed border-divider sm:mx-6"></div>
		<div
			class="flex w-full flex-col gap-y-1.5 px-3 pt-3 text-[0.8125rem] text-muted-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6"
		>
			<span class="text-left">
				Copyright © {copyrightYear}
				<a
					href="https://ill.li"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground">Canmi</a
				>. Released under the
				<a
					href="https://spdx.org/licenses/AGPL-3.0-or-later"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground">AGPLv3 License</a
				>.
			</span>
			<span class="flex flex-wrap items-center gap-x-2 text-left sm:justify-end sm:text-right">
				<a
					href="https://status.canmi.net/8zxeLKSP2t"
					target="_blank"
					rel="noopener noreferrer"
					class="relative inline-block hover:text-foreground"
				>
					<span aria-hidden="true" class="absolute top-1/2 -left-3 size-1.5 -translate-y-1/2">
						<span class="absolute inset-0 rounded-full bg-success motion-safe:animate-breathe"
						></span>
						<span
							class="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full bg-success/30"
						></span>
						<span class="absolute top-1/2 left-1/2 size-1.25 -translate-1/2 rounded-full bg-success"
						></span>
					</span>
					<span>All systems normal.</span>
				</a>
				<a
					href="https://icp.gov.moe/?keyword=20260000"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 hover:text-foreground"
				>
					<Lollipop class="size-3.25" strokeWidth={2} />
					<span>ICP 20260000</span>
				</a>
				{#if commitHash === 'dev'}
					<a
						href={repoUrl}
						target="_blank"
						rel="noopener noreferrer"
						title={commitHash}
						class="inline-flex items-center gap-1 hover:text-foreground"
					>
						<GitMerge class="size-3.25" strokeWidth={2} />
						<span>{shortHash}</span>
					</a>
				{:else}
					<a
						href="https://github.com/canmi21/taki/commit/{commitHash}"
						target="_blank"
						rel="noopener noreferrer"
						title={commitHash}
						class="inline-flex items-center gap-1 hover:text-foreground"
					>
						<GitMerge class="size-3.25" strokeWidth={2} />
						<span>{shortHash}</span>
					</a>
				{/if}
			</span>
		</div>
	</div>
</footer>
