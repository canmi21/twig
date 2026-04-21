<script lang="ts">
	import { Editor } from '@tiptap/core';
	import { untrack } from 'svelte';
	import type { DocV1 } from '$lib/content/schema';
	import { createExtensions } from './extensions';

	interface Props {
		doc?: DocV1;
		editable?: boolean;
		placeholder?: string;
		onUpdate?: (doc: DocV1) => void;
		onFocus?: () => void;
		onBlur?: () => void;
	}

	let {
		doc = $bindable(),
		editable = true,
		placeholder,
		onUpdate,
		onFocus,
		onBlur
	}: Props = $props();

	let element: HTMLDivElement | undefined = $state();
	let editor: Editor | null = null;

	$effect(() => {
		if (!element) return;
		editor = new Editor({
			element,
			extensions: createExtensions({ placeholder: untrack(() => placeholder) }),
			content: untrack(() => doc) ?? null,
			editable: untrack(() => editable),
			onUpdate: ({ editor: ed }) => {
				const next = ed.getJSON() as DocV1;
				doc = next;
				onUpdate?.(next);
			},
			onFocus: () => onFocus?.(),
			onBlur: () => onBlur?.()
		});
		return () => {
			editor?.destroy();
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

<div bind:this={element}></div>
