<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		DISPLAY_LONG_EDGE,
		DISPLAY_QUALITY,
		HQ_LONG_EDGE,
		HQ_QUALITY,
		HQ_THRESHOLD,
		inspectFile,
		probeSourceHash,
		processFile,
		uploadProcessed
	} from '$lib/media';
	import type { CropRect, DetectedMeta, ProcessedBlobs, UploadResult } from '$lib/media';

	type Phase = 'idle' | 'inspecting' | 'configuring' | 'working' | 'done' | 'error';

	let phase = $state<Phase>('idle');
	let file = $state<File | null>(null);
	let inspected = $state<DetectedMeta | null>(null);
	let duplicateMid = $state<string | null>(null);
	let progressLabel = $state('');
	let errorMessage = $state('');
	let result = $state<UploadResult | null>(null);
	let processed = $state<ProcessedBlobs | null>(null);

	let useCrop169 = $state(true);
	let altText = $state('');
	let capturedAtInput = $state('');
	let keepCameraMeta = $state(false);
	let keepGps = $state(false);
	let isPublic = $state(false);

	const derivedCrop = $derived.by<CropRect | null>(() => {
		if (!inspected || !useCrop169) return null;
		return centered169(inspected.width, inspected.height);
	});

	const willProduceHq = $derived.by(() => {
		if (!inspected) return false;
		const c = derivedCrop ?? {
			x: 0,
			y: 0,
			width: inspected.width,
			height: inspected.height
		};
		return Math.max(c.width, c.height) >= HQ_THRESHOLD;
	});

	function centered169(w: number, h: number): CropRect {
		const target = 16 / 9;
		const ratio = w / h;
		if (ratio >= target) {
			const cropW = Math.round(h * target);
			return { x: Math.round((w - cropW) / 2), y: 0, width: cropW, height: h };
		}
		const cropH = Math.round(w / target);
		return { x: 0, y: Math.round((h - cropH) / 2), width: w, height: cropH };
	}

	function toInputDatetime(d: Date | null): string {
		if (!d) return '';
		const pad = (n: number) => n.toString().padStart(2, '0');
		return (
			`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
			`T${pad(d.getHours())}:${pad(d.getMinutes())}`
		);
	}

	async function onFileChange(ev: Event) {
		const input = ev.currentTarget as HTMLInputElement;
		const picked = input.files?.[0] ?? null;
		if (!picked) return;
		file = picked;
		phase = 'inspecting';
		errorMessage = '';
		duplicateMid = null;
		try {
			inspected = await inspectFile(picked);
			altText = '';
			capturedAtInput = toInputDatetime(inspected.capturedAt);
			const maybeExisting = await probeSourceHash(inspected.sourceSha256);
			if (maybeExisting) duplicateMid = maybeExisting;
			phase = 'configuring';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'failed to inspect file';
			phase = 'error';
		}
	}

	async function onSubmit(ev: SubmitEvent) {
		ev.preventDefault();
		if (!file || !inspected) return;
		phase = 'working';
		errorMessage = '';
		try {
			progressLabel = 'Encoding WebP variants…';
			const prepared = await processFile(file, derivedCrop);
			processed = prepared;

			progressLabel = 'Uploading…';
			const capturedAt = capturedAtInput.length > 0 ? new Date(capturedAtInput) : null;
			const outcome = await uploadProcessed(prepared, {
				altText: altText.trim(),
				capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : null,
				exif: keepCameraMeta ? inspected.exif : null,
				gps: keepGps ? inspected.gps : null,
				isPublic,
				context: null
			});
			result = outcome;
			phase = 'done';
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'upload failed';
			phase = 'error';
		}
	}

	function reset() {
		phase = 'idle';
		file = null;
		inspected = null;
		duplicateMid = null;
		processed = null;
		result = null;
		errorMessage = '';
		altText = '';
		capturedAtInput = '';
	}

	function kb(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / 1024 / 1024).toFixed(2)} MB`;
	}
</script>

<div class="h-full overflow-auto">
	<div class="mx-auto flex max-w-3xl flex-col gap-6 p-8">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-semibold text-foreground">Upload media</h1>
			<a
				href={resolve('/@/media')}
				class="focus-ring rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-inset hover:text-foreground"
			>
				Back to library
			</a>
		</div>

		{#if phase === 'idle'}
			<label
				class="focus-within:ring-ring focus-ring flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background p-12 text-center hover:bg-inset"
			>
				<span class="text-sm font-medium text-foreground">Drop a file or click to pick</span>
				<span class="text-xs text-muted-foreground">
					JPEG / PNG / WebP / HEIC &mdash; Safari required for HEIC decode
				</span>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
					class="hidden"
					onchange={onFileChange}
				/>
			</label>
		{/if}

		{#if phase === 'inspecting'}
			<p class="text-sm text-muted-foreground">Reading file and parsing EXIF…</p>
		{/if}

		{#if (phase === 'configuring' || phase === 'working') && file && inspected}
			<form onsubmit={onSubmit} class="flex flex-col gap-6">
				<section class="flex flex-col gap-2 rounded-lg border border-border bg-inset/40 p-4">
					<div class="flex items-baseline justify-between">
						<span class="text-sm font-medium text-foreground">Source</span>
						<span class="font-code text-xs text-muted-foreground">
							{inspected.width}×{inspected.height} · {kb(inspected.bytes)} · {inspected.mime}
						</span>
					</div>
					{#if duplicateMid}
						<p class="text-xs text-warning">
							A file with this source hash already exists as
							<a href={resolve(`/@/media/${duplicateMid}`)} class="underline hover:no-underline"
								>{duplicateMid}</a
							>. Uploading will reuse it.
						</p>
					{/if}
					<details class="text-xs">
						<summary class="cursor-pointer text-muted-foreground">Detected EXIF</summary>
						<pre
							class="mt-2 whitespace-pre-wrap break-all font-code text-muted-foreground">{JSON.stringify(
								{
									capturedAt: inspected.capturedAt?.toISOString() ?? null,
									exif: inspected.exif,
									gps: inspected.gps
								},
								null,
								2
							)}</pre>
					</details>
				</section>

				<section class="flex flex-col gap-3">
					<div class="flex items-center gap-2 text-sm">
						<span class="text-muted-foreground">Crop</span>
						<button
							type="button"
							class={[
								'focus-ring rounded-md px-2 py-1 text-xs',
								useCrop169
									? 'bg-foreground text-background'
									: 'border border-border text-muted-foreground hover:bg-inset'
							]}
							onclick={() => (useCrop169 = true)}>16:9</button
						>
						<button
							type="button"
							class={[
								'focus-ring rounded-md px-2 py-1 text-xs',
								!useCrop169
									? 'bg-foreground text-background'
									: 'border border-border text-muted-foreground hover:bg-inset'
							]}
							onclick={() => (useCrop169 = false)}>Original</button
						>
					</div>
					<p class="text-xs text-muted-foreground">
						Will produce display ({DISPLAY_LONG_EDGE}px, q={DISPLAY_QUALITY})
						{#if willProduceHq}
							and hq ({HQ_LONG_EDGE}px, q={HQ_QUALITY})
						{/if}
						as WebP.
					</p>
				</section>

				<section class="flex flex-col gap-3">
					<label class="flex flex-col gap-1">
						<span class="text-sm text-foreground">Alt text</span>
						<input
							type="text"
							bind:value={altText}
							placeholder="Describe the image for screen readers"
							class="focus-ring rounded-md border border-border bg-background px-3 py-1.5 text-sm"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-sm text-foreground">Captured at</span>
						<input
							type="datetime-local"
							bind:value={capturedAtInput}
							class="focus-ring rounded-md border border-border bg-background px-3 py-1.5 text-sm"
						/>
					</label>
				</section>

				<section class="flex flex-col gap-2">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={keepCameraMeta} />
						<span>Keep camera metadata (ISO / lens / shutter / focal length)</span>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={keepGps} />
						<span>Keep GPS location</span>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={isPublic} />
						<span>Publicly accessible without auth</span>
					</label>
					<p class="text-xs text-muted-foreground">
						Camera metadata and GPS default to <strong>off</strong>. Once the image is served
						public, browser caches retain a copy even if you flip it private later.
					</p>
				</section>

				<div class="flex items-center gap-3">
					<button
						type="submit"
						disabled={phase === 'working'}
						class="focus-ring rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
					>
						{phase === 'working' ? progressLabel : duplicateMid ? 'Add reference' : 'Upload'}
					</button>
					<button
						type="button"
						onclick={reset}
						class="focus-ring rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-inset hover:text-foreground"
					>
						Cancel
					</button>
				</div>
			</form>
		{/if}

		{#if phase === 'done' && result}
			<section class="flex flex-col gap-4 rounded-lg border border-success bg-success/5 p-4">
				<div class="flex items-baseline justify-between">
					<h2 class="text-sm font-semibold text-success">
						{result.deduped ? 'Matched existing item' : 'Uploaded'}
					</h2>
					<a
						href={resolve(`/@/media/${result.mid}`)}
						class="focus-ring rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-90"
					>
						View detail
					</a>
				</div>
				<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-code text-xs">
					<dt class="text-muted-foreground">mid</dt>
					<dd class="break-all">{result.mid}</dd>
					<dt class="text-muted-foreground">display sha</dt>
					<dd class="break-all">{result.displaySha256}</dd>
					{#if result.hqSha256}
						<dt class="text-muted-foreground">hq sha</dt>
						<dd class="break-all">{result.hqSha256}</dd>
					{/if}
					{#if processed}
						<dt class="text-muted-foreground">display size</dt>
						<dd>
							{processed.display.width}×{processed.display.height} · {kb(
								processed.display.bytes.length
							)}
						</dd>
						{#if processed.hq}
							<dt class="text-muted-foreground">hq size</dt>
							<dd>{processed.hq.width}×{processed.hq.height} · {kb(processed.hq.bytes.length)}</dd>
						{/if}
						<dt class="text-muted-foreground">thumbhash</dt>
						<dd>{processed.thumbhash.length} B</dd>
					{/if}
				</dl>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={reset}
						class="focus-ring rounded-md border border-border px-3 py-1.5 text-xs hover:bg-inset"
					>
						Upload another
					</button>
					<button
						type="button"
						onclick={() => goto(resolve('/@/media'))}
						class="focus-ring rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-inset hover:text-foreground"
					>
						Back to library
					</button>
				</div>
			</section>
		{/if}

		{#if phase === 'error' && errorMessage}
			<section class="flex flex-col gap-2 rounded-lg border border-error bg-error/5 p-4">
				<p class="text-sm font-medium text-error">Upload failed</p>
				<p class="font-code text-xs text-error">{errorMessage}</p>
				<button
					type="button"
					onclick={reset}
					class="focus-ring self-start rounded-md border border-border px-3 py-1.5 text-xs hover:bg-inset"
				>
					Start over
				</button>
			</section>
		{/if}
	</div>
</div>
