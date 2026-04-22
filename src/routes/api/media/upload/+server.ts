import { error, json } from '@sveltejs/kit';
import { getDatabase } from '$lib/server/database';
import { isAdmin } from '$lib/server/auth-roles';
import { UploadError, uploadMedia } from '$lib/server/media/service';
import type { UploadExif, UploadGps, UploadInput } from '$lib/server/media/service';
import { mediaImageUrl, purgeUrls, mediaObjectUrl } from '$lib/server/media/purge';
import type { RequestHandler } from './$types';

// Multipart upload endpoint. The client pipeline in `$lib/media/pipeline`
// processes bytes locally (crop / resize / encode WebP / thumbhash /
// source sha256) and POSTs three parts: `meta` (JSON), `display` (WebP),
// optional `hq` (WebP). Server re-verifies container shape and owns the
// canonical content sha256 — we do not trust the client to address R2.

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform?.env.DATABASE) error(503, 'platform bindings unavailable');
	if (!isAdmin(locals.user?.id)) error(403, 'admin only');

	const form = await request.formData();
	const metaRaw = form.get('meta');
	const displayPart = form.get('display');
	const hqPart = form.get('hq');

	if (typeof metaRaw !== 'string') error(400, 'missing meta part');
	if (!(displayPart instanceof Blob)) error(400, 'missing display part');

	let meta: UploadMeta;
	try {
		meta = parseMeta(JSON.parse(metaRaw));
	} catch (err) {
		error(400, `invalid meta: ${err instanceof Error ? err.message : 'parse error'}`);
	}

	const displayBytes = new Uint8Array(await displayPart.arrayBuffer());
	const hqBytes = hqPart instanceof Blob ? new Uint8Array(await hqPart.arrayBuffer()) : null;
	if (!meta.hq !== !hqBytes) error(400, 'hq blob / meta mismatch');

	const input: UploadInput = {
		source: meta.source,
		display: { bytes: displayBytes, width: meta.display.width, height: meta.display.height },
		hq:
			hqBytes && meta.hq
				? { bytes: hqBytes, width: meta.hq.width, height: meta.hq.height }
				: undefined,
		thumbhash: base64ToBytes(meta.thumbhash),
		altText: meta.alt_text ?? null,
		capturedAt: meta.captured_at ?? null,
		exif: meta.exif ?? null,
		gps: meta.gps ?? null,
		isPublic: meta.is_public,
		context: meta.context ?? null
	};

	const db = getDatabase(platform.env);
	let result;
	try {
		result = await uploadMedia(platform.env, db, input);
	} catch (err) {
		if (err instanceof UploadError) error(err.status, err.message);
		throw err;
	}

	// Newly uploaded items are not yet cached anywhere; dedup hits may
	// have a stale `/api/media/object/{mid}` at the edge if visibility
	// changed. Best-effort purge covers both cases.
	if (platform.ctx) {
		const purgeList = [mediaObjectUrl(result.mid)];
		if (input.isPublic) {
			purgeList.push(mediaImageUrl(result.displaySha256));
			if (result.hqSha256) purgeList.push(mediaImageUrl(result.hqSha256));
		}
		platform.ctx.waitUntil(purgeUrls(platform.env, purgeList));
	}

	return json(
		{
			mid: result.mid,
			deduped: result.deduped,
			display_sha256: result.displaySha256,
			hq_sha256: result.hqSha256
		},
		{ status: result.deduped ? 200 : 201 }
	);
};

interface UploadMeta {
	source: UploadInput['source'];
	display: { width: number; height: number };
	hq?: { width: number; height: number };
	thumbhash: string;
	alt_text?: string | null;
	captured_at?: number | null;
	exif?: UploadExif | null;
	gps?: UploadGps | null;
	is_public: boolean;
	context?: string | null;
}

function parseMeta(raw: unknown): UploadMeta {
	if (!isRecord(raw)) throw new Error('meta is not an object');
	const source = raw.source;
	if (!isRecord(source)) throw new Error('source missing');
	const display = raw.display;
	if (!isRecord(display)) throw new Error('display missing');

	const meta: UploadMeta = {
		source: {
			sha256: requireHex(source.sha256, 'source.sha256'),
			mime: requireString(source.mime, 'source.mime'),
			bytes: requireInt(source.bytes, 'source.bytes'),
			width: requireInt(source.width, 'source.width'),
			height: requireInt(source.height, 'source.height')
		},
		display: {
			width: requireInt(display.width, 'display.width'),
			height: requireInt(display.height, 'display.height')
		},
		thumbhash: requireString(raw.thumbhash, 'thumbhash'),
		is_public: raw.is_public === true
	};

	if (isRecord(raw.hq)) {
		meta.hq = {
			width: requireInt(raw.hq.width, 'hq.width'),
			height: requireInt(raw.hq.height, 'hq.height')
		};
	}
	if (typeof raw.alt_text === 'string') meta.alt_text = raw.alt_text;
	if (typeof raw.captured_at === 'number') meta.captured_at = raw.captured_at;
	if (typeof raw.context === 'string') meta.context = raw.context;
	if (isRecord(raw.exif)) meta.exif = parseExif(raw.exif);
	if (isRecord(raw.gps)) meta.gps = parseGps(raw.gps);
	return meta;
}

function parseExif(raw: Record<string, unknown>): UploadExif {
	return {
		cameraMake: optString(raw.camera_make),
		cameraModel: optString(raw.camera_model),
		lensModel: optString(raw.lens_model),
		iso: optInt(raw.iso),
		aperture: optNumber(raw.aperture),
		shutter: optString(raw.shutter),
		focalLength: optNumber(raw.focal_length)
	};
}

function parseGps(raw: Record<string, unknown>): UploadGps {
	const lat = optNumber(raw.lat);
	const lng = optNumber(raw.lng);
	if (lat == null || lng == null) throw new Error('gps requires lat and lng');
	return { lat, lng };
}

function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function requireString(x: unknown, label: string): string {
	if (typeof x !== 'string' || x.length === 0)
		throw new Error(`${label} must be a non-empty string`);
	return x;
}

function requireHex(x: unknown, label: string): string {
	const s = requireString(x, label);
	if (!/^[0-9a-f]+$/.test(s)) throw new Error(`${label} must be lowercase hex`);
	return s;
}

function requireInt(x: unknown, label: string): number {
	if (typeof x !== 'number' || !Number.isInteger(x) || x < 0) {
		throw new Error(`${label} must be a non-negative integer`);
	}
	return x;
}

function optString(x: unknown): string | null {
	return typeof x === 'string' && x.length > 0 ? x : null;
}

function optInt(x: unknown): number | null {
	return typeof x === 'number' && Number.isInteger(x) ? x : null;
}

function optNumber(x: unknown): number | null {
	return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}
