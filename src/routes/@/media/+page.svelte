<script lang="ts">
	import IconLock from '@lucide/svelte/icons/lock';
	import IconGlobe from '@lucide/svelte/icons/globe';
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
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-8">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-semibold text-foreground">Media</h1>
			<a
				href={resolve('/@/media/new')}
				class="focus-ring rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
			>
				Upload
			</a>
		</div>

		{#if data.items.length === 0}
			<p class="text-sm text-muted-foreground">
				No media yet. Click "Upload" to add your first image.
			</p>
		{:else}
			<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
				{#each data.items as item (item.id)}
					<li>
						<a
							href={resolve(`/@/media/${item.id}`)}
							class="focus-ring group block overflow-hidden rounded-lg border border-border bg-background"
							title={item.altText ?? 'untitled'}
						>
							<div class="relative aspect-square bg-muted">
								<img
									src={`/api/media/image/${item.displaySha256}.webp`}
									alt={item.altText ?? ''}
									loading="lazy"
									decoding="async"
									class="size-full object-cover"
								/>
								<span
									class="absolute bottom-1 right-1 flex items-center rounded-full bg-background/80 p-1 text-xs backdrop-blur"
									title={item.isPublic ? 'Public' : 'Private'}
								>
									{#if item.isPublic}
										<IconGlobe class="size-3 text-success" />
									{:else}
										<IconLock class="size-3 text-muted-foreground" />
									{/if}
								</span>
							</div>
							<div class="flex flex-col gap-0.5 px-2 py-1.5 text-xs">
								<span class="truncate text-muted-foreground">
									{item.sourceWidth}×{item.sourceHeight}
								</span>
								<span class="truncate text-muted-foreground">{formatDate(item.createdAt)}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
