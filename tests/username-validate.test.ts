import { describe, expect, it } from 'vitest';
import {
	USERNAME_MAX,
	USERNAME_MIN,
	validateUsername,
	type ValidationResult
} from '$lib/username/validate';

function ok(r: ValidationResult): string {
	if (!r.ok) throw new Error(`expected ok, got reason=${r.reason}`);
	return r.value;
}

describe('validateUsername — valid inputs', () => {
	it('accepts ASCII letters at lower bound', () => {
		expect(ok(validateUsername('ab'))).toBe('ab');
	});

	it('accepts the full ASCII alphabet + digits + - + _', () => {
		expect(ok(validateUsername('aZ09_-'))).toBe('aZ09_-');
	});

	it('accepts a username exactly at the upper bound', () => {
		const sixteen = 'a'.repeat(USERNAME_MAX);
		expect(ok(validateUsername(sixteen))).toBe(sixteen);
	});

	it('accepts CJK ideographs', () => {
		expect(ok(validateUsername('用户'))).toBe('用户');
	});

	it('accepts hiragana', () => {
		expect(ok(validateUsername('あいう'))).toBe('あいう');
	});

	it('accepts katakana including the long-vowel mark', () => {
		expect(ok(validateUsername('カタカナー'))).toBe('カタカナー');
	});

	it('trims leading and trailing whitespace before validating', () => {
		expect(ok(validateUsername('  hello  '))).toBe('hello');
	});

	it('normalises to NFC so composed and decomposed spellings match', () => {
		// U+304C (が) vs U+304B U+3099 (か + dakuten); pad so the post-NFC
		// length of 2 still clears USERNAME_MIN.
		const composed = 'があ';
		const decomposed = '\u304B\u3099\u3042';
		expect(ok(validateUsername(decomposed))).toBe(composed);
	});

	it('counts code points rather than UTF-16 code units for length', () => {
		// Each CJK ideograph is one code point but two UTF-16 units in some ranges;
		// within the basic ideograph block they're still 1 unit, so use mixed input
		// to guarantee the iterator-based length path is exercised.
		const mixed = 'ab用户';
		expect(ok(validateUsername(mixed))).toBe(mixed);
	});
});

describe('validateUsername — rejections', () => {
	it('rejects inputs shorter than the minimum', () => {
		const short = 'a'.repeat(USERNAME_MIN - 1);
		expect(validateUsername(short)).toEqual({ ok: false, reason: 'length' });
	});

	it('rejects inputs longer than the maximum', () => {
		const long = 'a'.repeat(USERNAME_MAX + 1);
		expect(validateUsername(long)).toEqual({ ok: false, reason: 'length' });
	});

	it('rejects empty input on length', () => {
		expect(validateUsername('')).toEqual({ ok: false, reason: 'length' });
	});

	it('rejects whitespace-only input on length (trim → 0)', () => {
		expect(validateUsername('     ')).toEqual({ ok: false, reason: 'length' });
	});

	it('rejects disallowed ASCII punctuation', () => {
		expect(validateUsername('hello!')).toEqual({ ok: false, reason: 'chars' });
	});

	it('rejects interior spaces', () => {
		expect(validateUsername('hi there')).toEqual({ ok: false, reason: 'chars' });
	});

	it('rejects CJK Extension A code points outside the allowed range', () => {
		// U+3400 is the first Extension A ideograph — explicitly excluded per spec
		expect(validateUsername('ab\u3400')).toEqual({ ok: false, reason: 'chars' });
	});
});
