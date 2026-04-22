<script lang="ts">
	import IconGlobe from '@lucide/svelte/icons/globe';
	import IconLock from '@lucide/svelte/icons/lock';
	import IconTrash2 from '@lucide/svelte/icons/trash-2';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let meta = $derived(data.meta);

	let altText = $state(untrack(() => meta.alt_text ?? ''));
	let capturedAtInput = $state(untrack(() => toInputDatetime(meta.source.captured_at)));

	// Keep local edits in sync with server state after form enhance
	// invalidations — otherwise the inputs would reset only once per
	// mount, missing the updated value fetched by `invalidateAll`.
	$effect(() => {
		altText = meta.alt_text ?? '';
		capturedAtInput = toInputDatetime(meta.source.captured_at);
	});

	function toInputDatetime(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		const pad = (n: number) => n.toString().padStart(2, '0');
		return (
			`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
			`T${pad(d.getHours())}:${pad(d.getMinutes())}`
		);
	}

	function kb(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / 1024 / 1024).toFixed(2)} MB`;
	}

	function confirmDelete(ev: SubmitEvent) {
		if (!confirm('Delete this media item? Blobs will be GC\u2019d after the next cron sweep.')) {
			ev.preventDefault();
		}
	}

	function variantUrl(variant: { sha256: string; mime: string }): string {
		const ext = variant.mime.split('/')[1] ?? 'webp';
		return `/api/media/image/${variant.sha256}.${ext}`;
	}

	const displayVariant = $derived(
		meta.variants.find((v) => v.sha256 === meta.variants[0]?.sha256) ?? null
	);
	const hqVariant = $derived(meta.variants.find((v) => v !== displayVariant) ?? null);
</script>

<div class="h-full overflow-auto">
	<div class="mx-auto flex max-w-5xl flex-col gap-6 p-8">
		<div class="flex items-center justify-between">
			<div class="flex flex-col gap-1">
				<a
					href={resolve('/@/media')}
					class="focus-ring self-start rounded-sm text-xs text-muted-foreground hover:underline"
				>
					← Library
				</a>
				<h1 class="font-code text-sm font-semibold text-foreground">{meta.id}</h1>
			</div>
			<div class="flex items-center gap-2">
				<form
					method="POST"
					action="?/visibility"
					use:enhance={() => {
						return async ({ update }) => update();
					}}
				>
					<input
						type="hidden"
						name="is_public"
						value={meta.visibility === 'public' ? 'false' : 'true'}
					/>
					<button
						type="submit"
						class="focus-ring flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-inset"
					>
						{#if meta.visibility === 'public'}
							<IconGlobe class="size-3 text-success" /> Public (click to make private)
						{:else}
							<IconLock class="size-3 text-muted-foreground" /> Private (click to make public)
						{/if}
					</button>
				</form>
				<form method="POST" action="?/delete" onsubmit={confirmDelete} use:enhance>
					<button
						type="submit"
						class="focus-ring flex items-center gap-1.5 rounded-md border border-error/40 px-3 py-1.5 text-xs text-error hover:bg-error/10"
					>
						<IconTrash2 class="size-3" /> Delete
					</button>
				</form>
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-[1fr_280px]">
			<div class="flex flex-col gap-4">
				{#if displayVariant}
					<div class="overflow-hidden rounded-lg border border-border bg-muted">
						<img
							src={variantUrl(displayVariant)}
							alt={meta.alt_text ?? ''}
							width={displayVariant.width}
							height={displayVariant.height}
							class="h-auto w-full"
						/>
					</div>
				{/if}

				<form
					method="POST"
					action="?/update"
					class="flex flex-col gap-3 rounded-lg border border-border bg-background p-4"
					use:enhance={() => {
						return async ({ update }) => update();
					}}
				>
					<label class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Alt text</span>
						<input
							type="text"
							name="alt_text"
							bind:value={altText}
							class="focus-ring rounded-md border border-border bg-background px-3 py-1.5 text-sm"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs text-muted-foreground">Captured at</span>
						<input
							type="datetime-local"
							name="captured_at"
							bind:value={capturedAtInput}
							class="focus-ring rounded-md border border-border bg-background px-3 py-1.5 text-sm"
						/>
					</label>
					<div class="flex">
						<button
							type="submit"
							class="focus-ring rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-90"
						>
							Save
						</button>
					</div>
				</form>
			</div>

			<aside class="flex flex-col gap-4 text-xs">
				<section class="flex flex-col gap-1 rounded-lg border border-border bg-background p-3">
					<h2 class="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Source</h2>
					<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
						<dt class="text-muted-foreground">mime</dt>
						<dd class="font-code">{meta.source.mime}</dd>
						<dt class="text-muted-foreground">size</dt>
						<dd>{kb(meta.source.bytes_size)}</dd>
						<dt class="text-muted-foreground">dims</dt>
						<dd>{meta.source.width}×{meta.source.height}</dd>
						<dt class="text-muted-foreground">sha256</dt>
						<dd class="break-all font-code text-[10px]">{meta.source.sha256}</dd>
					</dl>
				</section>

				<section class="flex flex-col gap-1 rounded-lg border border-border bg-background p-3">
					<h2 class="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Variants</h2>
					<!-- Variant URLs point at the R2-proxy endpoint, not SvelteKit routes. -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<ul class="flex flex-col gap-2">
						{#each meta.variants as variant (variant.sha256)}
							<li class="flex flex-col gap-0.5">
								<span class="text-muted-foreground">
									{variant.width}×{variant.height} · {kb(variant.bytes_size)}
								</span>
								<a
									href={variantUrl(variant)}
									class="focus-ring break-all font-code text-[10px] text-primary hover:underline"
								>
									{variant.sha256}
								</a>
							</li>
						{/each}
					</ul>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</section>

				{#if meta.exif}
					<section class="flex flex-col gap-1 rounded-lg border border-border bg-background p-3">
						<h2 class="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Camera</h2>
						<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
							{#if meta.exif.camera_make}
								<dt class="text-muted-foreground">make</dt>
								<dd>{meta.exif.camera_make}</dd>
							{/if}
							{#if meta.exif.camera_model}
								<dt class="text-muted-foreground">model</dt>
								<dd>{meta.exif.camera_model}</dd>
							{/if}
							{#if meta.exif.lens_model}
								<dt class="text-muted-foreground">lens</dt>
								<dd>{meta.exif.lens_model}</dd>
							{/if}
							{#if meta.exif.iso != null}
								<dt class="text-muted-foreground">iso</dt>
								<dd>{meta.exif.iso}</dd>
							{/if}
							{#if meta.exif.aperture != null}
								<dt class="text-muted-foreground">aperture</dt>
								<dd>ƒ{meta.exif.aperture}</dd>
							{/if}
							{#if meta.exif.shutter}
								<dt class="text-muted-foreground">shutter</dt>
								<dd>{meta.exif.shutter}</dd>
							{/if}
							{#if meta.exif.focal_length != null}
								<dt class="text-muted-foreground">focal</dt>
								<dd>{meta.exif.focal_length}mm</dd>
							{/if}
						</dl>
					</section>
				{/if}

				{#if meta.gps}
					<section class="flex flex-col gap-1 rounded-lg border border-border bg-background p-3">
						<h2 class="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">GPS</h2>
						<p class="font-code">{meta.gps.lat.toFixed(5)}, {meta.gps.lng.toFixed(5)}</p>
					</section>
				{/if}

				{#if hqVariant}
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={variantUrl(hqVariant)}
						target="_blank"
						class="focus-ring rounded-md border border-border px-3 py-1.5 text-center text-xs hover:bg-inset"
					>
						View HQ variant ({hqVariant.width}×{hqVariant.height})
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</aside>
		</div>
	</div>
</div>
