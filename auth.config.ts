import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';

// Schema-only config consumed by `@better-auth/cli generate`.
// The runtime instance lives in src/lib/server/auth.ts (per-request
// factory, depends on $app/server which the CLI cannot resolve).
// Keep the plugin set here in lock-step with the runtime — the CLI
// derives the table shape from the plugin list and emits a drizzle
// schema file because of the adapter choice below.
export const auth = betterAuth({
	database: drizzleAdapter({} as never, { provider: 'sqlite' }),
	plugins: [
		emailOTP({
			async sendVerificationOTP() {
				/* schema-only stub */
			}
		})
	]
});
