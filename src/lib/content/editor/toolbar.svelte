<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { DropdownMenu, Popover } from 'bits-ui';
	import IconBold from '@lucide/svelte/icons/bold';
	import IconChevronDown from '@lucide/svelte/icons/chevron-down';
	import IconCode from '@lucide/svelte/icons/code';
	import IconImage from '@lucide/svelte/icons/image';
	import IconItalic from '@lucide/svelte/icons/italic';
	import IconLink from '@lucide/svelte/icons/link';
	import IconRedo from '@lucide/svelte/icons/redo-2';
	import IconRemoveFormatting from '@lucide/svelte/icons/remove-formatting';
	import IconStrikethrough from '@lucide/svelte/icons/strikethrough';
	import IconUnderline from '@lucide/svelte/icons/underline';
	import IconUndo from '@lucide/svelte/icons/undo-2';
	import LinkPopoverBody from './link-popover-body.svelte';

	interface Props {
		editor: Editor | null;
		linkPopoverOpen?: boolean;
		trailing?: Snippet;
	}

	let { editor, linkPopoverOpen = $bindable(false), trailing }: Props = $props();

	type BlockKind = 'paragraph' | 'heading2' | 'heading3';
	const BLOCK_LABEL: Record<BlockKind, string> = {
		paragraph: 'Paragraph',
		heading2: 'Heading 2',
		heading3: 'Heading 3'
	};

	let activeBold = $state(false);
	let activeItalic = $state(false);
	let activeUnderline = $state(false);
	let activeStrike = $state(false);
	let activeCode = $state(false);
	let activeLink = $state(false);
	let blockKind: BlockKind = $state('paragraph');
	let canUndo = $state(false);
	let canRedo = $state(false);
	let blockMenuOpen = $state(false);

	function refresh() {
		if (!editor) {
			activeBold = false;
			activeItalic = false;
			activeUnderline = false;
			activeStrike = false;
			activeCode = false;
			activeLink = false;
			blockKind = 'paragraph';
			canUndo = false;
			canRedo = false;
			return;
		}
		activeBold = editor.isActive('bold');
		activeItalic = editor.isActive('italic');
		activeUnderline = editor.isActive('underline');
		activeStrike = editor.isActive('strike');
		activeCode = editor.isActive('code');
		activeLink = editor.isActive('link');
		if (editor.isActive('heading', { level: 2 })) blockKind = 'heading2';
		else if (editor.isActive('heading', { level: 3 })) blockKind = 'heading3';
		else blockKind = 'paragraph';
		canUndo = editor.can().undo();
		canRedo = editor.can().redo();
	}

	$effect(() => {
		refresh();
		if (!editor) return;
		const handler = () => refresh();
		editor.on('selectionUpdate', handler);
		editor.on('update', handler);
		editor.on('transaction', handler);
		return () => {
			editor.off('selectionUpdate', handler);
			editor.off('update', handler);
			editor.off('transaction', handler);
		};
	});

	function setBlock(kind: BlockKind) {
		if (!editor) return;
		const c = editor.chain().focus();
		if (kind === 'paragraph') c.setParagraph().run();
		else if (kind === 'heading2') c.setHeading({ level: 2 }).run();
		else c.setHeading({ level: 3 }).run();
		blockMenuOpen = false;
	}

	// Stop-gap image insertion — prompts for a mid. The /@/media library
	// shows each item's mid on its detail page. A proper picker belongs
	// here eventually, but this keeps publish-time resolution testable
	// end-to-end without blocking on UI polish.
	function insertImagePrompt() {
		if (!editor) return;
		const raw = prompt('Paste media id (mid) from /@/media detail page:');
		if (!raw) return;
		const mid = raw.trim().toLowerCase();
		if (!/^[0-9a-f]{32}$/.test(mid)) {
			alert('Invalid mid — expected 32-char lowercase hex (UUIDv7)');
			return;
		}
		editor
			.chain()
			.focus()
			.insertContent({ type: 'image', attrs: { mid, alt: null } })
			.run();
	}

	const btnBase =
		'focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-inset hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground';
	const btnActive = 'bg-inset text-foreground';
	const itemClass =
		'flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs text-muted-foreground outline-none data-highlighted:bg-muted data-highlighted:text-foreground';
</script>

<div
	class="flex items-center gap-0.5 border-b border-border bg-muted px-2 py-1"
	role="toolbar"
	aria-label="Editor toolbar"
>
	<button
		type="button"
		class={btnBase}
		onclick={() => editor?.chain().focus().undo().run()}
		disabled={!canUndo}
		title="Undo (⌘Z)"
		aria-label="Undo"
	>
		<IconUndo class="size-4 " />
	</button>
	<button
		type="button"
		class={btnBase}
		onclick={() => editor?.chain().focus().redo().run()}
		disabled={!canRedo}
		title="Redo (⌘⇧Z)"
		aria-label="Redo"
	>
		<IconRedo class="size-4 " />
	</button>

	<div class="mx-1 h-5 w-px bg-divider" aria-hidden="true"></div>

	<DropdownMenu.Root bind:open={blockMenuOpen}>
		<DropdownMenu.Trigger
			class="focus-ring flex h-7 items-center gap-1 rounded px-2 text-xs text-foreground hover:bg-inset"
			aria-label="Block type"
		>
			{BLOCK_LABEL[blockKind]}
			<IconChevronDown class="size-3 " />
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				sideOffset={4}
				align="start"
				class="z-50 min-w-32 rounded-md border border-divider bg-background p-1 shadow-sm outline-none"
			>
				<DropdownMenu.Item onSelect={() => setBlock('paragraph')} class={itemClass}>
					Paragraph
					<span class="text-muted-foreground">⌘⌥0</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => setBlock('heading2')} class={itemClass}>
					Heading 2
					<span class="text-muted-foreground">⌘⌥2</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => setBlock('heading3')} class={itemClass}>
					Heading 3
					<span class="text-muted-foreground">⌘⌥3</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>

	<div class="mx-1 h-5 w-px bg-divider" aria-hidden="true"></div>

	<button
		type="button"
		class="{btnBase} {activeBold ? btnActive : ''}"
		onclick={() => editor?.chain().focus().toggleBold().run()}
		title="Bold (⌘B)"
		aria-label="Bold"
		aria-pressed={activeBold}
	>
		<IconBold class="size-4 " />
	</button>
	<button
		type="button"
		class="{btnBase} {activeItalic ? btnActive : ''}"
		onclick={() => editor?.chain().focus().toggleItalic().run()}
		title="Italic (⌘I)"
		aria-label="Italic"
		aria-pressed={activeItalic}
	>
		<IconItalic class="size-4 " />
	</button>
	<button
		type="button"
		class="{btnBase} {activeUnderline ? btnActive : ''}"
		onclick={() => editor?.chain().focus().toggleUnderline().run()}
		title="Underline (⌘U)"
		aria-label="Underline"
		aria-pressed={activeUnderline}
	>
		<IconUnderline class="size-4 " />
	</button>
	<button
		type="button"
		class="{btnBase} {activeStrike ? btnActive : ''}"
		onclick={() => editor?.chain().focus().toggleStrike().run()}
		title="Strikethrough (⌘⇧X)"
		aria-label="Strikethrough"
		aria-pressed={activeStrike}
	>
		<IconStrikethrough class="size-4 " />
	</button>
	<button
		type="button"
		class="{btnBase} {activeCode ? btnActive : ''}"
		onclick={() => editor?.chain().focus().toggleCode().run()}
		title="Inline code (⌘E)"
		aria-label="Inline code"
		aria-pressed={activeCode}
	>
		<IconCode class="size-4 " />
	</button>

	<div class="mx-1 h-5 w-px bg-divider" aria-hidden="true"></div>

	<Popover.Root bind:open={linkPopoverOpen}>
		<Popover.Trigger
			class="{btnBase} {activeLink ? btnActive : ''}"
			title="Link (⌘K)"
			aria-label="Link"
			aria-pressed={activeLink}
		>
			<IconLink class="size-4 " />
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content
				sideOffset={6}
				align="start"
				class="z-50 rounded-md border border-divider bg-background p-2 shadow-sm outline-none"
			>
				{#if editor}
					<LinkPopoverBody {editor} onClose={() => (linkPopoverOpen = false)} />
				{/if}
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>

	<button
		type="button"
		class={btnBase}
		onclick={() => editor?.chain().focus().unsetAllMarks().run()}
		title="Clear formatting (⌘\)"
		aria-label="Clear formatting"
	>
		<IconRemoveFormatting class="size-4 " />
	</button>

	<div class="mx-1 h-5 w-px bg-divider" aria-hidden="true"></div>

	<button
		type="button"
		class={btnBase}
		onclick={insertImagePrompt}
		title="Insert image"
		aria-label="Insert image"
	>
		<IconImage class="size-4 " />
	</button>

	{#if trailing}
		<div class="ml-auto flex items-center gap-1">
			{@render trailing()}
		</div>
	{/if}
</div>
