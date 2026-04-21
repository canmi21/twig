<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(ms: number): string {
		return new Date(ms).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="h-full overflow-auto">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 p-8">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-semibold text-foreground">Posts</h1>
			<a
				href={resolve('/@/editor/new')}
				class="focus-ring rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
			>
				New post
			</a>
		</div>

		{#if data.posts.length === 0}
			<p class="text-sm text-muted-foreground">No posts yet. Click "New post" to start.</p>
		{:else}
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border text-left text-xs text-muted-foreground">
						<th class="pb-2 font-normal">Title</th>
						<th class="pb-2 font-normal">Slug</th>
						<th class="pb-2 font-normal">Status</th>
						<th class="pb-2 text-right font-normal">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.posts as post (post.id)}
						<tr class="border-b border-divider">
							<td class="py-3">
								<a
									class="focus-ring rounded-sm hover:underline"
									href={resolve(`/@/editor/${post.id}`)}
								>
									{post.title || '(untitled)'}
								</a>
							</td>
							<td class="py-3 font-code text-xs text-muted-foreground">{post.slug}</td>
							<td class="py-3">
								{#if post.publishedAt}
									<span class="rounded-full border border-border px-2 py-0.5 text-xs text-success">
										Published
									</span>
								{:else}
									<span
										class="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
									>
										Draft
									</span>
								{/if}
							</td>
							<td class="py-3 text-right text-xs text-muted-foreground">
								{formatDate(post.updatedAt.getTime())}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
