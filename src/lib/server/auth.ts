import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';

// Crockford-style base32: digits + uppercase letters minus 0/O/1/I/L/U
// to avoid lookalikes in serif email fonts. 32 chars = exact 5-bit slice,
// so masking & 0x1f is unbiased — no rejection sampling needed.
const OTP_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateAlphanumericOtp(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = '';
	for (let i = 0; i < length; i++) {
		// 30 chars in alphabet, but we sample 0..31 from 5 bits and
		// reject the top 2 codepoints — keeps it unbiased without modulo.
		let byte = bytes[i] & 0x1f;
		while (byte >= OTP_ALPHABET.length) {
			const replacement = new Uint8Array(1);
			crypto.getRandomValues(replacement);
			byte = replacement[0] & 0x1f;
		}
		out += OTP_ALPHABET[byte];
	}
	return out;
}

function buildOptions(env: Env): BetterAuthOptions {
	return {
		database: env.DATABASE,
		advanced: {
			database: {
				// 32-char lowercase hex for every model (user, session, account,
				// verification). UUID v4 stripped of dashes — RFC 4122 entropy,
				// URL-safe, case-uniform.
				generateId: () => crypto.randomUUID().replace(/-/g, '')
			}
		},
		plugins: [
			emailOTP({
				otpLength: 6,
				expiresIn: 300,
				allowedAttempts: 3,
				generateOTP: () => generateAlphanumericOtp(6),
				async sendVerificationOTP({ email, otp, type }) {
					// TODO: swap to `env.EMAIL.send({...})` once the sending
					// domain is onboarded in CF Email Service. See spec/auth.md.
					console.log(`[email-otp] type=${type} to=${email} otp=${otp}`);
				}
			}),
			// Must be the last plugin — it patches outgoing responses with
			// SvelteKit's cookie API so Set-Cookie survives form actions.
			sveltekitCookies(getRequestEvent)
		]
	};
}

// Better Auth instances are non-trivial to construct (plugin router, schema
// resolution). Cache by env so we build at most once per isolate per binding.
// WeakMap keys on Env — when the isolate dies, the cache dies with it.
const cache = new WeakMap<Env, ReturnType<typeof betterAuth>>();

export function getAuth(env: Env): ReturnType<typeof betterAuth> {
	let auth = cache.get(env);
	if (!auth) {
		auth = betterAuth(buildOptions(env));
		cache.set(env, auth);
	}
	return auth;
}

export type Auth = ReturnType<typeof getAuth>;
