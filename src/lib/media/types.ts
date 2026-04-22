// Shared shapes for the browser-side upload pipeline. The server-side
// counterparts live in `$lib/server/media/service` — they overlap in
// spirit but not in types (the client never touches drizzle row types,
// the server never touches Blob / ImageBitmap).

export type CropPresetName = 'original' | '16:9' | '4:3' | '1:1' | '3:2' | 'free';

export interface CropPreset {
	name: CropPresetName;
	label: string;
	ratio: number | null; // null = free / original (no enforced aspect)
}

export interface CropRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DetectedExif {
	cameraMake: string | null;
	cameraModel: string | null;
	lensModel: string | null;
	iso: number | null;
	aperture: number | null;
	shutter: string | null;
	focalLength: number | null;
}

export interface DetectedGps {
	lat: number;
	lng: number;
}

export interface DetectedMeta {
	sourceSha256: string;
	mime: string;
	bytes: number;
	width: number;
	height: number;
	capturedAt: Date | null;
	exif: DetectedExif | null;
	gps: DetectedGps | null;
}

export interface ProcessedVariant {
	bytes: Uint8Array;
	width: number;
	height: number;
}

export interface ProcessedBlobs {
	source: {
		sha256: string;
		mime: string;
		bytes: number;
		width: number;
		height: number;
	};
	display: ProcessedVariant;
	hq: ProcessedVariant | null;
	thumbhash: Uint8Array;
}

export interface UploadMeta {
	altText: string;
	capturedAt: Date | null;
	exif: DetectedExif | null;
	gps: DetectedGps | null;
	isPublic: boolean;
	context: string | null;
}

export interface UploadResult {
	mid: string;
	deduped: boolean;
	displaySha256: string;
	hqSha256: string | null;
}
