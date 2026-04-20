import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { getDatabase, schema } from '$lib/server/database';

// Crockford-style base32: digits + uppercase letters minus 0/O/1/I/L/U
// to avoid lookalikes in serif email fonts. 30 chars in the alphabet, but
// we sample 0..31 from a 5-bit slice and reject the top 2 codepoints.
const OTP_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateAlphanumericOtp(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = '';
	for (let i = 0; i < length; i++) {
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

// Emails ending in `.local` are reserved for dev/preview seeds — they get
// a fixed OTP `000000`, no email is sent, and the user.create.before hook
// blocks them outright in production.
function isDotLocal(email: string): boolean {
	return email.toLowerCase().endsWith('.local');
}

// Return type intentionally inferred — annotating it as `BetterAuthOptions`
// widens the plugin tuple to the empty supertype, which makes `auth.api`
// lose the email-otp endpoints (sendVerificationOTP, signInEmailOTP, …).
function buildOptions(env: Env) {
	// `dev` is the authoritative local-mode signal. platformProxy surfaces the
	// wrangler.jsonc `vars` default ("production") to vite dev too, so falling
	// back to ENVIRONMENT alone would misclassify local dev as prod and trip
	// the `.local` creation guard. Preview still rides `--var ENVIRONMENT:preview`
	// from the Justfile recipe; the deployed worker keeps "production".
	const isProd = !dev && (env.ENVIRONMENT as string) === 'production';

	return {
		// drizzleAdapter reads auth-schema.ts's column mappings (e.g. TS
		// `expiresAt` ↔ DB `expires_at`), so Better Auth speaks the same
		// snake_case dialect the migrations use. Raw `env.DATABASE` would
		// fall back to the kysely adapter, which ignores those mappings.
		database: drizzleAdapter(getDatabase(env), { provider: 'sqlite', schema }),
		advanced: {
			database: {
				// 32-char lowercase hex for every model. UUID v4 stripped of
				// dashes — RFC 4122 entropy, URL-safe, case-uniform.
				generateId: () => crypto.randomUUID().replace(/-/g, '')
			}
		},
		databaseHooks: {
			user: {
				create: {
					// Returning `false` aborts the create. .local is a dev-only
					// convention; in production any attempt to register one is
					// either a typo or someone probing the dev affordance.
					before: async (user: { email: string }) => {
						if (isProd && isDotLocal(user.email)) return false;
					}
				}
			}
		},
		plugins: [
			emailOTP({
				otpLength: 6,
				expiresIn: 300,
				allowedAttempts: 3,
				generateOTP: ({ email }) => {
					if (isDotLocal(email)) return '000000';
					return generateAlphanumericOtp(6);
				},
				async sendVerificationOTP({ email, otp, type }) {
					// .local users already know their OTP is 000000, no point
					// trying to deliver to a domain that doesn't exist.
					if (isDotLocal(email)) return;

					// vite dev has no EMAIL binding — log to terminal so the
					// developer can copy the code without leaving the editor.
					if (!env.EMAIL) {
						console.log(`[email-otp] type=${type} to=${email} otp=${otp}`);
						return;
					}

					await env.EMAIL.send({
						to: email,
						from: env.EMAIL_FROM,
						subject: `Your code: ${otp}`,
						text: `Your verification code is ${otp}. It expires in 5 minutes.`
					});
				}
			}),
			// Must be the last plugin — patches outgoing responses with
			// SvelteKit's cookie API so Set-Cookie survives form actions.
			sveltekitCookies(getRequestEvent)
		]
	};
}

// Better Auth instances are non-trivial to construct (plugin router, schema
// resolution). Cache by env so we build at most once per isolate per binding.
function buildAuth(env: Env) {
	return betterAuth(buildOptions(env));
}

const cache = new WeakMap<Env, ReturnType<typeof buildAuth>>();

export function getAuth(env: Env): ReturnType<typeof buildAuth> {
	let auth = cache.get(env);
	if (!auth) {
		auth = buildAuth(env);
		cache.set(env, auth);
	}
	return auth;
}

export type Auth = ReturnType<typeof getAuth>;
