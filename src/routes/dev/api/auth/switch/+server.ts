import { dev } from '$app/environment';
import { error, type RequestHandler } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { DEV_SEED_USERS, type DevRole } from '$lib/server/auth-roles';

// Dev-only session-flip endpoint backing the floating DevOverlay. Three
// double-locks before the body runs:
//   1. `dev` from $app/environment — vite-dev-only, false in any prod build.
//   2. `platform.env.DATABASE` — satisfied by both vite dev (via adapter's
//      platformProxy) and `just preview` (wrangler/miniflare). 503 here means
//      the platform proxy itself is misconfigured, not an expected branch.
//   3. The route lives under /dev/, which the dev-routes layout 404s in
//      production; this guard is the in-endpoint belt to that suspenders.
//
// Sign-in path mimics what a normal user does — sendVerificationOTP creates
// a verification row, signInEmailOTP consumes it. The .local generateOTP
// override in src/lib/server/auth.ts pins the value to "000000", so this
// works without any in-memory bypass of the OTP machinery.
export const POST: RequestHandler = async ({ url, platform, request }) => {
	if (!dev) error(404);
	if (!platform?.env.DATABASE) {
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

	// Lazy seed: guarantees the seeded user exists with the canonical fixed
	// ID before signInEmailOTP runs. Without this, a fresh DB would auto-
	// create the user with a random ID and isAdmin() would silently return
	// false for what the overlay calls "admin". INSERT OR IGNORE keeps it
	// idempotent — the explicit `just database-seed-local` recipe stays
	// useful for vitest fixtures and bulk reseeds.
	const now = Date.now();
	await platform.env.DATABASE.prepare(
		`INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
		 VALUES (?, ?, ?, 1, ?, ?)`
	)
		.bind(seed.id, seed.name, seed.email, now, now)
		.run();

	await auth.api.sendVerificationOTP({
		body: { email: seed.email, type: 'sign-in' }
	});

	return await auth.api.signInEmailOTP({
		body: { email: seed.email, otp: '000000' },
		asResponse: true
	});
};
