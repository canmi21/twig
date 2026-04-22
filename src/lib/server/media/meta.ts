import type { Database } from '../database';
import { getMediaBlob, isItemPublic } from './service';

type MediaItemRow = NonNullable<Awaited<ReturnType<typeof import('./service').getMediaItem>>>;

export interface MediaObjectMeta {
	id: string;
	type: 'image';
	visibility: 'public' | 'private';
	created_at: string;
	updated_at: string;
	alt_text: string | null;
	thumbhash: string;
	source: {
		sha256: string;
		mime: string;
		bytes_size: number;
		width: number;
		height: number;
		captured_at: string | null;
	};
	exif: {
		camera_make: string | null;
		camera_model: string | null;
		lens_model: string | null;
		iso: number | null;
		aperture: number | null;
		shutter: string | null;
		focal_length: number | null;
	} | null;
	gps: { lat: number; lng: number } | null;
	variants: Array<{
		sha256: string;
		mime: string;
		width: number;
		height: number;
		bytes_size: number;
	}>;
}

// Build the JSON response for `/api/media/object/{mid}`. Variants carry
// `sha256 + mime` only — callers reconstruct the URL as
// `/api/media/image/{sha256}.{ext}` where ext = mime.split('/')[1]. The
// URL shape is a server-side contract, not payload data. `thumbhash` is
// base64-encoded raw bytes; decoding is the client's responsibility via
// the `thumbhash` npm package.
export async function buildObjectMeta(db: Database, item: MediaItemRow): Promise<MediaObjectMeta> {
	const [displayBlob, hqBlob, visible] = await Promise.all([
		getMediaBlob(db, item.displaySha256),
		item.hqSha256 ? getMediaBlob(db, item.hqSha256) : Promise.resolve(null),
		isItemPublic(db, item.id)
	]);

	const variants: MediaObjectMeta['variants'] = [];
	if (displayBlob) {
		variants.push({
			sha256: displayBlob.contentSha256,
			mime: displayBlob.mime,
			width: displayBlob.width,
			height: displayBlob.height,
			bytes_size: displayBlob.bytesSize
		});
	}
	if (hqBlob) {
		variants.push({
			sha256: hqBlob.contentSha256,
			mime: hqBlob.mime,
			width: hqBlob.width,
			height: hqBlob.height,
			bytes_size: hqBlob.bytesSize
		});
	}
	variants.sort((a, b) => a.width * a.height - b.width * b.height);

	const hasExif =
		item.cameraMake ||
		item.cameraModel ||
		item.lensModel ||
		item.iso != null ||
		item.aperture != null ||
		item.shutter ||
		item.focalLength != null;

	return {
		id: item.id,
		type: 'image',
		visibility: visible ? 'public' : 'private',
		created_at: item.createdAt.toISOString(),
		updated_at: item.updatedAt.toISOString(),
		alt_text: item.altText,
		thumbhash: bytesToBase64(asBytes(item.thumbhash)),
		source: {
			sha256: item.sourceSha256,
			mime: item.sourceMime,
			bytes_size: item.sourceBytes,
			width: item.sourceWidth,
			height: item.sourceHeight,
			captured_at: item.capturedAt ? item.capturedAt.toISOString() : null
		},
		exif: hasExif
			? {
					camera_make: item.cameraMake,
					camera_model: item.cameraModel,
					lens_model: item.lensModel,
					iso: item.iso,
					aperture: item.aperture,
					shutter: item.shutter,
					focal_length: item.focalLength
				}
			: null,
		gps: item.gpsLat != null && item.gpsLng != null ? { lat: item.gpsLat, lng: item.gpsLng } : null,
		variants
	};
}

function asBytes(value: unknown): Uint8Array {
	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	if (Array.isArray(value)) return new Uint8Array(value as number[]);
	throw new Error(`thumbhash column returned unexpected type: ${typeof value}`);
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
