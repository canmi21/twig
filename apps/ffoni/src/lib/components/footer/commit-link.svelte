<script lang="ts">
	import GitMerge from '@lucide/svelte/icons/git-merge';

	import { m } from '$lib/paraglide/messages';

	const commitHash = __APP_GIT_COMMIT__;
	const shortHash = commitHash.slice(0, 7);
	const commitPath = commitHash === 'dev' ? '' : `/commit/${commitHash}`;
</script>

<a
	href="https://github.com/canmi21/taki{commitPath}"
	target="_blank"
	rel="noopener noreferrer"
	aria-label={m['footer.commit.aria']({ hash: shortHash })}
	class="focus-ring inline-flex items-center gap-1 hover:text-foreground focus-visible:text-foreground"
>
	<GitMerge class="size-3.25" strokeWidth={2} aria-hidden="true" />
	<span>{shortHash}</span>
</a>
