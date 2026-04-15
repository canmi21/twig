<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	import GitMerge from '@lucide/svelte/icons/git-merge';
	import Lollipop from '@lucide/svelte/icons/lollipop';

	const repoUrl = 'https://github.com/canmi21/taki';
	const commitHash = __APP_GIT_COMMIT__;
	const shortHash = commitHash.slice(0, 7);
</script>

<span class="flex flex-wrap items-center gap-x-2 text-left sm:justify-end sm:text-right">
	<span class="relative inline-block">
		<span aria-hidden="true" class="absolute top-1/2 -left-3 size-1.5 -translate-y-1/2">
			<span class="absolute inset-0 rounded-full bg-success motion-safe:animate-breathe"></span>
			<span class="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full bg-success/30"
			></span>
			<span class="absolute top-1/2 left-1/2 size-1.25 -translate-1/2 rounded-full bg-success"
			></span>
		</span>
		<a
			href="https://status.canmi.net/8zxeLKSP2t"
			target="_blank"
			rel="noopener noreferrer"
			aria-label={m['footer.status.aria']()}
			class="hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
			>{m['footer.status.normal']()}</a
		>
	</span>
	<span class="inline-flex items-center gap-1">
		<Lollipop class="size-3.25" strokeWidth={2} aria-hidden="true" />
		{#if getLocale() === 'zh'}
			<a
				href="https://beian.miit.gov.cn"
				target="_blank"
				rel="noopener noreferrer"
				aria-label={m['footer.icp.aria']()}
				class="hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
				>{m['footer.icp.text']()}</a
			>
		{:else}
			<a
				href="https://icp.gov.moe/?keyword=20260000"
				target="_blank"
				rel="noopener noreferrer"
				aria-label={m['footer.icp.aria']()}
				class="hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
				>{m['footer.icp.text']()}</a
			>
		{/if}
	</span>
	<span class="inline-flex items-center gap-1">
		<GitMerge class="size-3.25" strokeWidth={2} aria-hidden="true" />
		{#if commitHash === 'dev'}
			<a
				href={repoUrl}
				target="_blank"
				rel="noopener noreferrer"
				title={commitHash}
				aria-label={m['footer.commit.aria']({ hash: shortHash })}
				class="hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
				>{shortHash}</a
			>
		{:else}
			<a
				href="https://github.com/canmi21/taki/commit/{commitHash}"
				target="_blank"
				rel="noopener noreferrer"
				title={commitHash}
				aria-label={m['footer.commit.aria']({ hash: shortHash })}
				class="hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
				>{shortHash}</a
			>
		{/if}
	</span>
</span>
