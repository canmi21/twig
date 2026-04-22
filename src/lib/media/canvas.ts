import type { CropRect, ProcessedVariant } from './types';

// Variant targets. Display is the default `<img src>` — sized for DPR-2
// Retina at ~900px reading width. HQ is only produced when the crop is
// large enough that display loses visible detail, and sits at 2560 long
// edge for DPR-3 mobile / "view original" affordance. Anything smaller
// than the display target is kept at its native size (no upsampling).
export const DISPLAY_LONG_EDGE = 1920;
export const HQ_LONG_EDGE = 2560;
export const HQ_THRESHOLD = 2560;
export const DISPLAY_QUALITY = 0.85;
export const HQ_QUALITY = 0.92;
export const THUMBHASH_LONG_EDGE = 100;

export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
	return createImageBitmap(blob);
}

// Dimensions after scaling a crop to a long-edge target, never upsampling.
export function fitToLongEdge(
	cropWidth: number,
	cropHeight: number,
	longEdge: number
): { width: number; height: number } {
	const maxDim = Math.max(cropWidth, cropHeight);
	if (maxDim <= longEdge) {
		return { width: Math.round(cropWidth), height: Math.round(cropHeight) };
	}
	const scale = longEdge / maxDim;
	return {
		width: Math.max(1, Math.round(cropWidth * scale)),
		height: Math.max(1, Math.round(cropHeight * scale))
	};
}

export function shouldProduceHq(cropWidth: number, cropHeight: number): boolean {
	return Math.max(cropWidth, cropHeight) >= HQ_THRESHOLD;
}

export function resolveCrop(source: ImageBitmap, crop: CropRect | null): CropRect {
	if (!crop) return { x: 0, y: 0, width: source.width, height: source.height };
	const x = Math.max(0, Math.min(source.width, Math.round(crop.x)));
	const y = Math.max(0, Math.min(source.height, Math.round(crop.y)));
	const width = Math.max(1, Math.min(source.width - x, Math.round(crop.width)));
	const height = Math.max(1, Math.min(source.height - y, Math.round(crop.height)));
	return { x, y, width, height };
}

function drawCrop(
	source: ImageBitmap,
	crop: CropRect,
	targetWidth: number,
	targetHeight: number
): OffscreenCanvas {
	const canvas = new OffscreenCanvas(targetWidth, targetHeight);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2d context unavailable');
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight);
	return canvas;
}

export async function renderVariant(
	source: ImageBitmap,
	crop: CropRect,
	longEdge: number,
	quality: number
): Promise<ProcessedVariant> {
	const { width, height } = fitToLongEdge(crop.width, crop.height, longEdge);
	const canvas = drawCrop(source, crop, width, height);
	const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
	const bytes = new Uint8Array(await blob.arrayBuffer());
	return { bytes, width, height };
}

// Returns an RGBA pixel buffer of the cropped+downscaled image, clamped
// to THUMBHASH_LONG_EDGE on the long edge. Feed to `rgbaToThumbHash`.
export function renderThumbhashPixels(
	source: ImageBitmap,
	crop: CropRect
): { rgba: Uint8Array; width: number; height: number } {
	const { width, height } = fitToLongEdge(crop.width, crop.height, THUMBHASH_LONG_EDGE);
	const canvas = drawCrop(source, crop, width, height);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2d context unavailable');
	const imageData = ctx.getImageData(0, 0, width, height);
	return { rgba: new Uint8Array(imageData.data.buffer.slice(0)), width, height };
}
