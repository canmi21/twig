// Minimal WebP container check. The upload route trusts the `/@/` admin
// gate but still validates container shape — a malformed blob stored under
// a sha256 key would poison the dedup table forever. Cost is O(12 bytes),
// not a real parse.

const RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

export function isWebP(bytes: Uint8Array): boolean {
	if (bytes.length < 12) return false;
	for (let i = 0; i < 4; i++) if (bytes[i] !== RIFF[i]) return false;
	for (let i = 0; i < 4; i++) if (bytes[8 + i] !== WEBP[i]) return false;
	return true;
}
