// Pure username validator. No DOM, no framework imports — so the same code
// runs in the browser (footer editor) and later on the Cloudflare Worker
// (account system / rate limiting).

export type ValidationResult =
	| { ok: true; value: string }
	| { ok: false; reason: 'length' | 'chars' };

export const USERNAME_MIN = 2;
export const USERNAME_MAX = 16;

// ASCII alnum + `-_`, basic CJK ideographs (U+4E00-9FFF), hiragana, katakana.
// CJK Extensions and Compatibility Ideographs are excluded by design.
export const ALLOWED_USERNAME = /^[A-Za-z0-9_\-\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+$/u;

export function validateUsername(raw: string): ValidationResult {
	const value = raw.trim().normalize('NFC');
	const length = [...value].length;
	if (length < USERNAME_MIN || length > USERNAME_MAX) {
		return { ok: false, reason: 'length' };
	}
	if (!ALLOWED_USERNAME.test(value)) {
		return { ok: false, reason: 'chars' };
	}
	return { ok: true, value };
}
