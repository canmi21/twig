import { rgbaToThumbHash } from 'thumbhash';
import type { CropRect } from './types';
import { renderThumbhashPixels } from './canvas';

// Single-step wrapper around thumbhash + canvas pixel read. Called once
// per upload, output is ~25 bytes stored as BLOB in D1 and rendered as a
// blur placeholder until the real image decodes in the client.
export function computeThumbhash(source: ImageBitmap, crop: CropRect): Uint8Array {
	const { rgba, width, height } = renderThumbhashPixels(source, crop);
	return rgbaToThumbHash(width, height, rgba);
}
