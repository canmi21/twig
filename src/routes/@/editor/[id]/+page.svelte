<script lang="ts">
	import type { Editor as TiptapEditor } from '@tiptap/core';
	import { untrack } from 'svelte';
	import IconPanelRight from '@lucide/svelte/icons/panel-right-open';
	import IconX from '@lucide/svelte/icons/x';
	import { enhance } from '$app/forms';
	import Bubble from '$lib/content/editor/bubble.svelte';
	import Editor from '$lib/content/editor/editor.svelte';
	import Toolbar from '$lib/content/editor/toolbar.svelte';
	import type { DocV1 } from '$lib/content/schema';
	import { slugify } from '$lib/content/slug';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Read server-loaded values once into local state. `untrack` signals to
	// Svelte that the non-reactive capture is intentional (these are initial
	// values for user-editable fields, not mirrors of the prop).
	const initialTitle = untrack(() => data.post.title);
	const initialSlug = untrack(() => data.post.slug);
	const initialDescription = untrack(() => data.post.description ?? '');
	const initialDoc = untrack(() => {
		try {
			return JSON.parse(data.post.contentJson) as DocV1;
		} catch {
			return undefined;
		}
	});
	const initialSlugFollowsTitle = untrack(
		() => data.post.slug === `draft-${data.post.id.slice(-10)}`
	);

	let title = $state(initialTitle);
	let slug = $state(initialSlug);
	let description = $state(initialDescription);
	let doc: DocV1 | undefined = $state(initialDoc);
	let editor: TiptapEditor | null = $state(null);
	let toolbarLinkOpen = $state(false);
	let drawerOpen = $state(false);

	// Slug auto-follows title until the author edits the slug field manually.
	let slugFollowsTitle = $state(initialSlugFollowsTitle);
	let lastAutoSlug = $state(slugify(initialTitle));

	$effect(() => {
		if (!slugFollowsTitle) return;
		const auto = slugify(title);
		if (auto && auto !== slug) {
			slug = auto;
			lastAutoSlug = auto;
		}
	});

	function onSlugInput() {
		if (slug !== lastAutoSlug) slugFollowsTitle = false;
	}

	// Esc closes the drawer.
	$effect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape' && drawerOpen) drawerOpen = false;
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const isPublished = $derived(data.post.publishedAt !== null);

	function formatDate(d: Date): string {
		return d.toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const displayTitle = $derived(title.trim() || '(untitled)');
</script>

<div class="relative flex h-full flex-col">
	<form id="post-save-form" method="POST" action="?/save" use:enhance class="contents">
		<input type="hidden" name="title" value={title} />
		<input type="hidden" name="slug" value={slug} />
		<input type="hidden" name="description" value={description} />
		<input
			type="hidden"
			name="content"
			value={JSON.stringify(doc ?? { type: 'doc', content: [] })}
		/>
	</form>

	<div class="flex flex-1 flex-col overflow-hidden">
		{#if editor}
			<Toolbar {editor} bind:linkPopoverOpen={toolbarLinkOpen}>
				{#snippet trailing()}
					{#if form?.error}
						<span class="mr-1 text-xs text-destructive">{form.error}</span>
					{:else if form?.success}
						<span class="mr-1 text-xs text-success">Saved</span>
					{/if}
					<button
						form="post-save-form"
						type="submit"
						class="focus-ring rounded-md bg-foreground px-3 py-1 text-xs text-background hover:opacity-90"
					>
						Save
					</button>
					<button
						type="button"
						onclick={() => (drawerOpen = !drawerOpen)}
						class="focus-ring flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-inset hover:text-foreground"
						title="Post metadata"
						aria-label="Post metadata"
						aria-expanded={drawerOpen}
					>
						<IconPanelRight class="size-4" />
					</button>
				{/snippet}
			</Toolbar>
			<Bubble {editor} />
		{/if}
		<div class="mx-auto w-full max-w-3xl flex-1 overflow-auto px-6 py-10">
			<Editor
				bind:doc
				bind:editor
				placeholder="Start typing…"
				onLinkShortcut={() => (toolbarLinkOpen = true)}
			/>
		</div>
	</div>

	<div class="flex items-center justify-between border-t border-border bg-background px-4 py-2">
		<div class="flex items-center gap-3">
			<form method="POST" action={isPublished ? '?/unpublish' : '?/publish'} use:enhance>
				<button
					type="submit"
					class="focus-ring rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-inset"
				>
					{isPublished ? 'Unpublish' : 'Publish'}
				</button>
			</form>
			{#if isPublished && data.post.publishedAt}
				<span class="text-xs text-success">
					Published {formatDate(data.post.publishedAt)}
				</span>
			{:else}
				<span class="text-xs text-muted-foreground">Draft</span>
			{/if}
		</div>
		<form
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Delete this post? This cannot be undone.')) e.preventDefault();
			}}
		>
			<button
				type="submit"
				class="focus-ring rounded-md px-3 py-1 text-xs text-destructive hover:bg-inset"
			>
				Delete
			</button>
		</form>
	</div>

	<!-- Right-side metadata drawer. Slides off-screen when closed; no backdrop. -->
	<aside
		class={[
			'absolute top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-border bg-background shadow-lg transition-transform duration-200',
			drawerOpen ? 'translate-x-0' : 'translate-x-full'
		]}
		aria-hidden={!drawerOpen}
	>
		<div class="flex items-center justify-between border-b border-divider px-4 py-3">
			<h2 class="text-sm font-semibold text-foreground">Post metadata</h2>
			<button
				type="button"
				onclick={() => (drawerOpen = false)}
				class="focus-ring flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-inset hover:text-foreground"
				aria-label="Close"
			>
				<IconX class="size-4" />
			</button>
		</div>

		<div class="flex flex-1 flex-col gap-4 overflow-auto p-4 text-sm">
			<label class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">Title</span>
				<input
					bind:value={title}
					placeholder="Post title"
					class="focus-ring rounded-md border border-border bg-background px-2 py-1 text-foreground"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="flex items-center justify-between text-xs text-muted-foreground">
					Slug
					{#if slugFollowsTitle}
						<span class="text-[10px]">auto</span>
					{/if}
				</span>
				<input
					bind:value={slug}
					oninput={onSlugInput}
					class="focus-ring rounded-md border border-border bg-background px-2 py-1 font-code text-xs text-foreground"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">Description</span>
				<textarea
					bind:value={description}
					rows="3"
					placeholder="Short description for feed / OG"
					class="focus-ring resize-none rounded-md border border-border bg-background px-2 py-1 text-foreground"
				></textarea>
			</label>
		</div>

		<div class="border-t border-divider px-4 py-3 text-xs text-muted-foreground">
			<div class="truncate">{displayTitle}</div>
		</div>
	</aside>
</div>
