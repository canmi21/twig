<script lang="ts">
	import type { Editor as TiptapEditor } from '@tiptap/core';
	import Bubble from '$lib/content/editor/bubble.svelte';
	import Editor from '$lib/content/editor/editor.svelte';
	import Toolbar from '$lib/content/editor/toolbar.svelte';
	import { type DocV1, validateDoc } from '$lib/content/schema';

	let doc: DocV1 | undefined = $state();
	let editor: TiptapEditor | null = $state(null);
	let toolbarLinkOpen = $state(false);

	const validation = $derived.by(() => {
		if (doc === undefined) return { ok: true as const, message: 'no content yet' };
		try {
			validateDoc(doc);
			return { ok: true as const, message: 'valid v1' };
		} catch (err) {
			return { ok: false as const, message: formatError(err) };
		}
	});

	function formatError(err: unknown): string {
		if (err instanceof Error) return err.message.split('\n').slice(0, 3).join(' · ');
		return String(err);
	}

	function copyJson() {
		void navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
	}

	async function copyHtml(html: string) {
		await navigator.clipboard.writeText(html);
	}

	const presets: Record<string, DocV1> = {
		empty: { type: 'doc', content: [] },
		'headings only': {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2 heading' }] },
				{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3 heading' }] }
			]
		},
		'all marks': {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'bold ', marks: [{ type: 'bold' }] },
						{ type: 'text', text: 'italic ', marks: [{ type: 'italic' }] },
						{ type: 'text', text: 'strike ', marks: [{ type: 'strike' }] },
						{ type: 'text', text: 'under ', marks: [{ type: 'underline' }] },
						{ type: 'text', text: 'code ', marks: [{ type: 'code' }] },
						{
							type: 'text',
							text: 'link',
							marks: [{ type: 'link', attrs: { href: 'https://example.com/' } }]
						}
					]
				}
			]
		},
		'nested marks': {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'bold + italic + code',
							marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'code' }]
						}
					]
				}
			]
		},
		'malformed (should fail)': {
			type: 'doc',
			content: [
				// h1 is rejected by the validator. Editor's parseHTML clamps pasted
				// h1 to h2, but raw JSON like this still goes straight to the gate.
				// @ts-expect-error intentional invalid level for the failure demo
				{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'h1' }] }
			]
		}
	};

	const pasteSamples: Record<string, string> = {
		'h1+h4 (Notion-like)':
			'<h1>Top heading</h1><h4>Sub heading</h4><p>Body paragraph with <strong>bold</strong>.</p>',
		'table (should flatten)':
			'<table><tr><td>cell A</td><td>cell B</td></tr></table><p>after table</p>',
		'list (should flatten)': '<ul><li>first item</li><li>second item</li></ul><p>after list</p>',
		'a with target+class':
			'<p>see <a href="https://example.com" target="_blank" class="evil">this</a></p>'
	};

	function loadDoc(name: keyof typeof presets) {
		doc = structuredClone(presets[name]);
	}
</script>

<div class="flex h-screen flex-col">
	<div class="flex flex-1 overflow-hidden">
		<div class="flex flex-1 flex-col border-r border-border">
			<Toolbar {editor} bind:linkPopoverOpen={toolbarLinkOpen} />
			<Bubble {editor} />
			<div class="flex-1 overflow-auto p-6">
				<Editor
					bind:doc
					bind:editor
					placeholder="Start typing…"
					onLinkShortcut={() => (toolbarLinkOpen = true)}
				/>
			</div>
		</div>
		<div class="flex w-1/2 flex-col gap-3 p-6">
			<div class="flex items-center gap-2">
				<h1 class="text-sm font-medium text-muted-foreground">Inspector</h1>
				<span
					class={[
						'rounded-md border px-2 py-0.5 text-xs',
						validation.ok ? 'border-border text-success' : 'border-border text-destructive'
					]}
				>
					{validation.ok ? '✓' : '✗'}
					{validation.message}
				</span>
				<button
					type="button"
					onclick={copyJson}
					class="focus-ring ml-auto rounded-md border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-inset"
				>
					Copy JSON
				</button>
			</div>
			<div class="flex flex-col gap-1">
				<div class="text-xs text-muted-foreground">Load doc:</div>
				<div class="flex flex-wrap gap-1">
					{#each Object.keys(presets) as name (name)}
						<button
							type="button"
							onclick={() => loadDoc(name as keyof typeof presets)}
							class="focus-ring rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							{name}
						</button>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-1">
				<div class="text-xs text-muted-foreground">
					Copy HTML to clipboard, then paste into the editor:
				</div>
				<div class="flex flex-wrap gap-1">
					{#each Object.entries(pasteSamples) as [name, html] (name)}
						<button
							type="button"
							onclick={() => copyHtml(html)}
							class="focus-ring rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							{name}
						</button>
					{/each}
				</div>
			</div>
			<pre
				class="flex-1 overflow-auto rounded-md border border-border bg-muted p-4 font-code text-xs">{JSON.stringify(
					doc,
					null,
					2
				)}</pre>
		</div>
	</div>
</div>
