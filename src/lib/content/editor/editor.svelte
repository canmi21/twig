<script lang="ts">
	import { Editor, Extension } from '@tiptap/core';
	import { untrack } from 'svelte';
	import type { DocV1 } from '$lib/content/schema';
	import { createExtensions } from './extensions';

	interface Props {
		doc?: DocV1;
		editor?: Editor | null;
		editable?: boolean;
		placeholder?: string;
		onUpdate?: (doc: DocV1) => void;
		onFocus?: () => void;
		onBlur?: () => void;
		onLinkShortcut?: () => void;
	}

	let {
		doc = $bindable(),
		editor = $bindable(null),
		editable = true,
		placeholder,
		onUpdate,
		onFocus,
		onBlur,
		onLinkShortcut
	}: Props = $props();

	let element: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!element) return;

		// Captured at construction; if the parent rebinds this callback we keep
		// the original. Acceptable since openLinkPopover() callers are stable.
		const linkCb = untrack(() => onLinkShortcut);
		const ShortcutsExt = Extension.create({
			name: 'twigShortcuts',
			addKeyboardShortcuts: () => ({
				'Mod-k': () => {
					linkCb?.();
					return true;
				},
				'Mod-\\': ({ editor: ed }) => ed.chain().focus().unsetAllMarks().run()
			})
		});

		const ed = new Editor({
			element,
			extensions: [...createExtensions({ placeholder: untrack(() => placeholder) }), ShortcutsExt],
			content: untrack(() => doc) ?? null,
			editable: untrack(() => editable),
			onUpdate: ({ editor: e }) => {
				const next = e.getJSON() as DocV1;
				doc = next;
				onUpdate?.(next);
			},
			onFocus: () => onFocus?.(),
			onBlur: () => onBlur?.()
		});
		editor = ed;
		return () => {
			ed.destroy();
			editor = null;
		};
	});

	// External doc updates: re-set content only when it actually differs from
	// what the editor currently holds, otherwise we'd thrash on every keystroke.
	$effect(() => {
		if (!editor || doc === undefined) return;
		const current = editor.getJSON();
		if (JSON.stringify(current) === JSON.stringify(doc)) return;
		editor.commands.setContent(doc, { emitUpdate: false });
	});

	$effect(() => {
		if (!editor) return;
		editor.setEditable(editable);
	});
</script>

<div bind:this={element} class="twig-editor-content"></div>
