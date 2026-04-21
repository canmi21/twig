<script lang="ts">
	import type { Editor } from '@tiptap/core';

	interface Props {
		editor: Editor;
		onClose: () => void;
	}

	let { editor, onClose }: Props = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let url = $state('');
	let isEditing = $state(false);

	$effect(() => {
		const attrs = editor.getAttributes('link');
		if (attrs.href) {
			url = String(attrs.href);
			isEditing = true;
		} else {
			url = '';
			isEditing = false;
		}
		queueMicrotask(() => inputEl?.focus());
	});

	function apply() {
		const trimmed = url.trim();
		if (!trimmed) return;
		editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
		onClose();
	}

	function remove() {
		editor.chain().focus().extendMarkRange('link').unsetLink().run();
		onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			apply();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}
</script>

<div class="flex items-center gap-2">
	<input
		bind:this={inputEl}
		bind:value={url}
		type="url"
		placeholder="Paste or type URL"
		onkeydown={onKeydown}
		class="focus-ring w-64 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
	/>
	{#if isEditing}
		<button
			type="button"
			onclick={remove}
			class="focus-ring rounded-md px-2 py-1 text-xs text-destructive hover:bg-inset"
		>
			Remove
		</button>
	{/if}
	<button
		type="button"
		onclick={apply}
		class="focus-ring rounded-md bg-foreground px-2 py-1 text-xs text-background hover:opacity-90"
	>
		Apply
	</button>
</div>
