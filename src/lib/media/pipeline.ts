import { decodeImage, renderVariant, resolveCrop, shouldProduceHq } from './canvas';
import { DISPLAY_LONG_EDGE, DISPLAY_QUALITY, HQ_LONG_EDGE, HQ_QUALITY } from './canvas';
import { readExif } from './exif';
import { sha256Hex } from './sha';
import { computeThumbhash } from './thumbhash';
import type { CropRect, DetectedMeta, ProcessedBlobs, UploadMeta, UploadResult } from './types';

// End-to-end browser pipeline. Three stages that can be called
// independently from the UI so each screen (inspect → crop → confirm)
// can render progress before the next stage starts.

// Inspect: read EXIF + dimensions + source hash. Purely read-only —
// doesn't touch the image bytes beyond decoding for dimensions.
export async function inspectFile(file: File): Promise<DetectedMeta> {
	const buffer = await file.arrayBuffer();
	const [sourceSha256, exifData, bitmap] = await Promise.all([
		sha256Hex(buffer),
		readExif(file),
		decodeImage(file)
	]);
	try {
		return {
			sourceSha256,
			mime: file.type || 'application/octet-stream',
			bytes: file.size,
			width: bitmap.width,
			height: bitmap.height,
			capturedAt: exifData.capturedAt,
			exif: exifData.exif,
			gps: exifData.gps
		};
	} finally {
		bitmap.close();
	}
}

// Probe the server for an existing item with the same source bytes.
// Returns the mid if found, null otherwise. Admin-only endpoint; a
// rejection here means we're not authenticated — let the real upload
// surface that error.
export async function probeSourceHash(sha256: string): Promise<string | null> {
	const res = await fetch(`/api/media/source/${sha256}`, {
		credentials: 'same-origin'
	});
	if (res.status === 404) return null;
	if (!res.ok) return null;
	const data = (await res.json()) as { mid?: string };
	return data.mid ?? null;
}

// Process: decode → crop → resize → encode display (+hq) → compute
// thumbhash. Stays in the client — the server only receives the final
// WebP bytes and structured metadata.
export async function processFile(file: File, crop: CropRect | null): Promise<ProcessedBlobs> {
	const buffer = await file.arrayBuffer();
	const sourceSha256 = await sha256Hex(buffer);
	const bitmap = await decodeImage(file);
	try {
		const resolvedCrop = resolveCrop(bitmap, crop);

		const [display, hq, thumbhash] = await Promise.all([
			renderVariant(bitmap, resolvedCrop, DISPLAY_LONG_EDGE, DISPLAY_QUALITY),
			shouldProduceHq(resolvedCrop.width, resolvedCrop.height)
				? renderVariant(bitmap, resolvedCrop, HQ_LONG_EDGE, HQ_QUALITY)
				: Promise.resolve(null),
			Promise.resolve(computeThumbhash(bitmap, resolvedCrop))
		]);

		return {
			source: {
				sha256: sourceSha256,
				mime: file.type || 'application/octet-stream',
				bytes: file.size,
				width: bitmap.width,
				height: bitmap.height
			},
			display,
			hq,
			thumbhash
		};
	} finally {
		bitmap.close();
	}
}

// Upload: send the processed blobs + structured metadata to the server.
// Privacy toggles (`keep_camera_meta`, `keep_gps`) are applied *here* —
// if the toggle is off we drop the detected values before they hit the
// network. The server writes whatever it receives, so stripping at this
// layer is the privacy contract.
export async function uploadProcessed(
	processed: ProcessedBlobs,
	meta: UploadMeta
): Promise<UploadResult> {
	const form = new FormData();
	const metaPayload = {
		source: processed.source,
		display: { width: processed.display.width, height: processed.display.height },
		hq: processed.hq ? { width: processed.hq.width, height: processed.hq.height } : undefined,
		thumbhash: bytesToBase64(processed.thumbhash),
		alt_text: meta.altText,
		captured_at: meta.capturedAt ? meta.capturedAt.getTime() : null,
		exif: meta.exif,
		gps: meta.gps,
		is_public: meta.isPublic,
		context: meta.context
	};
	form.set('meta', JSON.stringify(metaPayload));
	form.set(
		'display',
		new Blob([processed.display.bytes as BlobPart], { type: 'image/webp' }),
		'display.webp'
	);
	if (processed.hq) {
		form.set('hq', new Blob([processed.hq.bytes as BlobPart], { type: 'image/webp' }), 'hq.webp');
	}

	const res = await fetch('/api/media/upload', {
		method: 'POST',
		body: form,
		credentials: 'same-origin'
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`upload failed: ${res.status} ${detail}`);
	}
	const data = (await res.json()) as {
		mid: string;
		deduped: boolean;
		display_sha256: string;
		hq_sha256: string | null;
	};
	return {
		mid: data.mid,
		deduped: data.deduped,
		displaySha256: data.display_sha256,
		hqSha256: data.hq_sha256
	};
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
