import { dev } from '$app/environment';
import { error, type RequestHandler } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { DEV_SEED_USERS, type DevRole } from '$lib/server/auth-roles';

// Dev-only session-flip backing the floating DevOverlay.
export const POST: RequestHandler = async ({ url, platform, request }) => {
	if (!dev) error(404);
	if (!platform?.env.DATABASE) {
		// platformProxy misconfigured — the adapter supplies this in vite dev.
		error(503, 'auth requires the cloudflare runtime; use `just preview`');
	}

	const as = url.searchParams.get('as');
	const auth = getAuth(platform.env);

	if (as === 'none') {
		const res = await auth.api.signOut({
			headers: request.headers,
			asResponse: true
		});
		return res;
	}

	if (as !== 'admin' && as !== 'user') {
		error(400, 'expected ?as=admin|user|none');
	}
	const seed = DEV_SEED_USERS[as as DevRole];

	// Pins the seed ID; otherwise signInEmailOTP auto-creates a random-ID user
	// and isAdmin() silently rejects what the overlay calls "admin".
	const now = Date.now();
	await platform.env.DATABASE.prepare(
		`INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
		 VALUES (?, ?, ?, 1, ?, ?)`
	)
		.bind(seed.id, seed.name, seed.email, now, now)
		.run();

	// Real OTP pipeline; generateOTP in src/lib/server/auth.ts pins .local
	// emails to "000000", so no bypass of the OTP machinery is needed.
	await auth.api.sendVerificationOTP({
		body: { email: seed.email, type: 'sign-in' }
	});

	return await auth.api.signInEmailOTP({
		body: { email: seed.email, otp: '000000' },
		asResponse: true
	});
};
