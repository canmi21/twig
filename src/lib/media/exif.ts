import exifr from 'exifr';
import type { DetectedExif, DetectedGps } from './types';

// Parse EXIF with `pick` — exifr fetches only the listed tags and skips
// the rest of the file, which keeps the client fast on large images.
// The default bundle supports JPEG/TIFF/HEIC/PNG/WebP — enough for any
// camera the user is likely to shoot with. `translateValues: false`
// preserves raw EXIF units so downstream formatters have unambiguous
// input.

const EXIFR_OPTIONS = {
	pick: [
		'Make',
		'Model',
		'LensModel',
		'LensMake',
		'ISO',
		'ISOSpeedRatings',
		'FNumber',
		'ExposureTime',
		'FocalLength',
		'DateTimeOriginal',
		'DateTimeDigitized',
		'latitude',
		'longitude'
	],
	translateKeys: false,
	translateValues: false,
	reviveValues: true,
	mergeOutput: true
};

export interface RawEXIF {
	exif: DetectedExif | null;
	gps: DetectedGps | null;
	capturedAt: Date | null;
}

export async function readExif(file: Blob): Promise<RawEXIF> {
	let data: Record<string, unknown> | null;
	try {
		data = (await exifr.parse(file, EXIFR_OPTIONS as unknown as boolean)) as Record<
			string,
			unknown
		> | null;
	} catch {
		data = null;
	}
	if (!data) return { exif: null, gps: null, capturedAt: null };

	const exif: DetectedExif = {
		cameraMake: takeString(data, 'Make'),
		cameraModel: takeString(data, 'Model'),
		lensModel: takeString(data, 'LensModel') ?? takeString(data, 'LensMake'),
		iso: takeNumber(data, 'ISO') ?? takeNumber(data, 'ISOSpeedRatings'),
		aperture: takeNumber(data, 'FNumber'),
		shutter: shutterString(takeNumber(data, 'ExposureTime')),
		focalLength: takeNumber(data, 'FocalLength')
	};

	const lat = takeNumber(data, 'latitude');
	const lng = takeNumber(data, 'longitude');
	const gps = lat != null && lng != null ? { lat, lng } : null;

	const capturedAt =
		takeDate(data, 'DateTimeOriginal') ?? takeDate(data, 'DateTimeDigitized') ?? null;

	return {
		exif: exifIsEmpty(exif) ? null : exif,
		gps,
		capturedAt
	};
}

function exifIsEmpty(e: DetectedExif): boolean {
	return (
		!e.cameraMake &&
		!e.cameraModel &&
		!e.lensModel &&
		e.iso == null &&
		e.aperture == null &&
		!e.shutter &&
		e.focalLength == null
	);
}

function takeString(data: Record<string, unknown>, key: string): string | null {
	const v = data[key];
	if (typeof v !== 'string') return null;
	const trimmed = v.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function takeNumber(data: Record<string, unknown>, key: string): number | null {
	const v = data[key];
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	return null;
}

function takeDate(data: Record<string, unknown>, key: string): Date | null {
	const v = data[key];
	if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
	if (typeof v === 'string') {
		const d = new Date(v);
		if (!Number.isNaN(d.getTime())) return d;
	}
	return null;
}

// Present "1/250" rather than 0.004 — photographers read the reciprocal
// form. Above one-second we return decimals ("1.5s") since fractional
// notation stops helping there.
function shutterString(seconds: number | null): string | null {
	if (seconds == null || seconds <= 0) return null;
	if (seconds >= 1) return `${Number(seconds.toFixed(2))}s`;
	const denom = Math.round(1 / seconds);
	return `1/${denom}`;
}
