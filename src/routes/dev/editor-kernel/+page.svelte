<script lang="ts">
	import Editor from '$lib/content/editor/editor.svelte';
	import { type DocV1, validateDoc } from '$lib/content/schema';

	let doc: DocV1 | undefined = $state();

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
				// h1 is rejected by both the validator and the Tiptap schema.
				// @ts-expect-error intentional invalid level for the failure demo
				{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'h1' }] }
			]
		}
	};

	function load(name: keyof typeof presets) {
		doc = structuredClone(presets[name]);
	}
</script>

<div class="flex h-screen">
	<div class="flex flex-1 flex-col gap-2 border-r border-border p-6">
		<h1 class="text-sm font-medium text-muted-foreground">Editor</h1>
		<div class="flex-1 overflow-auto rounded-md border border-border bg-muted p-4">
			<Editor bind:doc placeholder="Start typing..." />
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
		<div class="flex flex-wrap gap-1">
			{#each Object.keys(presets) as name (name)}
				<button
					type="button"
					onclick={() => load(name as keyof typeof presets)}
					class="focus-ring rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					{name}
				</button>
			{/each}
		</div>
		<pre
			class="flex-1 overflow-auto rounded-md border border-border bg-muted p-4 font-code text-xs">{JSON.stringify(
				doc,
				null,
				2
			)}</pre>
	</div>
</div>
