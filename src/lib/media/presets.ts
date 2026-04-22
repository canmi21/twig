import type { CropPreset } from './types';

// Default is 16:9 landscape per editorial convention — article images are
// usually displayed inside a reading-width column where widescreen reads
// cleanly. User can always switch to a different preset or free crop.
export const CROP_PRESETS: readonly CropPreset[] = [
	{ name: '16:9', label: '16:9', ratio: 16 / 9 },
	{ name: '4:3', label: '4:3', ratio: 4 / 3 },
	{ name: '3:2', label: '3:2', ratio: 3 / 2 },
	{ name: '1:1', label: '1:1', ratio: 1 },
	{ name: 'original', label: 'Original', ratio: null },
	{ name: 'free', label: 'Free', ratio: null }
];

export const DEFAULT_PRESET: CropPreset = CROP_PRESETS[0];
