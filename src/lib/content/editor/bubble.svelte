<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
	import { Popover } from 'bits-ui';
	import IconBold from '@lucide/svelte/icons/bold';
	import IconCode from '@lucide/svelte/icons/code';
	import IconItalic from '@lucide/svelte/icons/italic';
	import IconLink from '@lucide/svelte/icons/link';
	import IconStrikethrough from '@lucide/svelte/icons/strikethrough';
	import IconUnderline from '@lucide/svelte/icons/underline';
	import LinkPopoverBody from './link-popover-body.svelte';

	interface Props {
		editor: Editor | null;
	}

	let { editor }: Props = $props();

	let element: HTMLDivElement | undefined = $state();
	let activeBold = $state(false);
	let activeItalic = $state(false);
	let activeUnderline = $state(false);
	let activeStrike = $state(false);
	let activeCode = $state(false);
	let activeLink = $state(false);
	let linkOpen = $state(false);

	function refresh() {
		if (!editor) {
			activeBold = false;
			activeItalic = false;
			activeUnderline = false;
			activeStrike = false;
			activeCode = false;
			activeLink = false;
			return;
		}
		activeBold = editor.isActive('bold');
		activeItalic = editor.isActive('italic');
		activeUnderline = editor.isActive('underline');
		activeStrike = editor.isActive('strike');
		activeCode = editor.isActive('code');
		activeLink = editor.isActive('link');
	}

	$effect(() => {
		if (!editor || !element) return;
		const plugin = BubbleMenuPlugin({
			pluginKey: 'bubbleMenu',
			editor,
			element,
			updateDelay: 0
		});
		editor.registerPlugin(plugin);
		return () => editor.unregisterPlugin('bubbleMenu');
	});

	$effect(() => {
		refresh();
		if (!editor) return;
		const handler = () => refresh();
		editor.on('selectionUpdate', handler);
		editor.on('transaction', handler);
		return () => {
			editor.off('selectionUpdate', handler);
			editor.off('transaction', handler);
		};
	});

	const btnBase =
		'focus-ring flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-inset hover:text-foreground';
	const btnActive = 'bg-inset text-foreground';
</script>

<div
	bind:this={element}
	role="toolbar"
	aria-label="Selection toolbar"
	class="flex items-center gap-0.5 rounded-md border border-divider bg-background p-1 shadow-sm"
	style:display="none"
>
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

	<div class="mx-0.5 h-4 w-px bg-divider" aria-hidden="true"></div>

	<Popover.Root bind:open={linkOpen}>
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
					<LinkPopoverBody {editor} onClose={() => (linkOpen = false)} />
				{/if}
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
</div>
