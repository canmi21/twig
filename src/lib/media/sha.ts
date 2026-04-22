// Client-side SHA-256 mirror of the server helper. Separated so browser
// bundles don't pull in any server modules. Uses the same
// ArrayBuffer-copy trick to dodge `SharedArrayBuffer` variance in lib.dom.

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', toContiguousBuffer(data));
	return toHex(new Uint8Array(digest));
}

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
