// AES-GCM helpers for encrypting at-rest secrets (signing keys, TOTP secrets,
// recovery codes). Uses Web Crypto so it runs identically in Workers and in
// Node-side scripts.

const enc = new TextEncoder();
const dec = new TextDecoder();

export async function importMasterKey(hex: string): Promise<CryptoKey> {
	if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
		throw new Error('master key must be 64 hex characters (32 bytes)');
	}
	const bytes = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// Output layout: 12-byte IV || ciphertext (with 16-byte GCM tag appended).
export async function encryptBlob(key: CryptoKey, plaintext: BufferSource): Promise<ArrayBuffer> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
	const out = new Uint8Array(iv.byteLength + ct.byteLength);
	out.set(iv, 0);
	out.set(new Uint8Array(ct), iv.byteLength);
	return out.buffer;
}

export async function decryptBlob(key: CryptoKey, payload: BufferSource): Promise<ArrayBuffer> {
	const buf =
		payload instanceof ArrayBuffer
			? payload
			: payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
	const iv = new Uint8Array(buf, 0, 12);
	const ct = new Uint8Array(buf, 12);
	return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
}

// TextEncoder always backs its output with a fresh ArrayBuffer (never
// SharedArrayBuffer), so the cast is sound at runtime.
export function jsonEncode(obj: unknown): ArrayBuffer {
	return enc.encode(JSON.stringify(obj)).buffer as ArrayBuffer;
}

export function jsonDecode<T>(buf: BufferSource): T {
	return JSON.parse(dec.decode(buf));
}
