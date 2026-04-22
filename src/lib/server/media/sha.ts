// SHA-256 helpers for content-addressed media. Operates on ArrayBuffer /
// Uint8Array rather than strings so callers don't pay an encode round-trip
// on the hot path (upload bytes are already binary; object meta JSON is
// hashed via the string overload).

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', toContiguousBuffer(data));
	return toHex(new Uint8Array(digest));
}

export async function sha256HexString(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest('SHA-256', toContiguousBuffer(bytes));
	return toHex(new Uint8Array(digest));
}

// Normalize into a fresh ArrayBuffer of known shape. SubtleCrypto's `digest`
// signature in lib.dom rejects `SharedArrayBuffer`-backed views and typed
// arrays with non-ArrayBuffer backings; copying sidesteps the variance
// entirely and costs a single memcpy.
function toContiguousBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
	if (data instanceof ArrayBuffer) return data;
	const out = new ArrayBuffer(data.byteLength);
	new Uint8Array(out).set(data);
	return out;
}

function toHex(bytes: Uint8Array): string {
	const out = new Array<string>(bytes.length);
	for (let i = 0; i < bytes.length; i++) out[i] = bytes[i].toString(16).padStart(2, '0');
	return out.join('');
}
