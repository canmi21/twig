## Auth

Better Auth on Cloudflare D1. Schema in `src/lib/server/database/auth-schema.ts` (CLI-generated), runtime in `src/lib/server/auth.ts`.

| Concern         | Where                                                |
| --------------- | ---------------------------------------------------- |
| Runtime         | `src/lib/server/auth.ts` (`getAuth(env)` factory)    |
| CLI config      | `auth.config.ts` (project root, schema-only stub)    |
| Schema          | `src/lib/server/database/auth-schema.ts` (generated) |
| Schema entry    | re-exported via `src/lib/server/database/schema.ts`  |
| Catch-all route | `src/routes/api/auth/[...path]/+server.ts`           |
| Hook            | `src/lib/hooks/auth.ts` (last in `hooks.server.ts`)  |
| Locals          | `event.locals.user` / `event.locals.session` (typed) |

## Why a factory, not a top-level `auth`

The D1 binding (`env.DATABASE`) only exists inside a request scope on Workers — `betterAuth({ database: env.DATABASE })` at module top-level crashes on cold start because `env` is undefined at import time. `getAuth(env)` is cached in a `WeakMap<Env, Auth>` so each isolate builds the instance once, not per request.

## Why two config files

- `src/lib/server/auth.ts` — the runtime, depends on `$app/server` (`getRequestEvent`) which only resolves inside SvelteKit's bundle.
- `auth.config.ts` — what `@better-auth/cli generate` reads. Mirrors the runtime plugin set so the generated schema stays accurate, but uses a stubbed Drizzle adapter and no SvelteKit-specific imports.

When you change the runtime plugin set, mirror it in `auth.config.ts` and re-run:

```
bunx @better-auth/cli generate --config ./auth.config.ts --output ./src/lib/server/database/auth-schema.ts --yes
just database-generate
just database-migrate-local
```

## ID format

All models (`user`, `session`, `account`, `verification`) use 32-char lowercase hex IDs via `crypto.randomUUID().replace(/-/g, '')`. URL-safe, case-uniform, RFC 4122 v4 entropy under the hood.

## OTP format

6 chars from a Crockford-style alphabet (`23456789ABCDEFGHJKMNPQRSTVWXYZ`, 30 chars) — digits + uppercase letters minus the lookalikes `0/O/1/I/L/U`. Generated with `crypto.getRandomValues()` and 5-bit slicing with rejection of the top 2 codepoints, so the distribution is unbiased. 30^6 ≈ 729M combinations, plenty for a 5-minute OTP with 3 attempts.

## Email delivery (TODO)

`sendVerificationOTP` currently `console.log`s the OTP — fine for `just preview` testing. To wire CF Email Service (public beta as of 2026-04-16):

1. In CF dash → Email Sending, onboard the sending domain (auto-provisions MX/SPF/DKIM/DMARC).
2. Add to `wrangler.jsonc`:
   ```jsonc
   "send_email": [{ "name": "EMAIL", "remote": true }]
   ```
3. Re-run `just gen` so `Env.EMAIL` types in.
4. Replace the `console.log` body in `src/lib/server/auth.ts` with:
   ```ts
   await env.EMAIL.send({
   	to: email,
   	from: 'no-reply@<your-domain>',
   	subject: `Your code: ${otp}`,
   	text: `Your verification code is ${otp}. Expires in 5 minutes.`
   });
   ```

## Anonymous users (deferred)

Out of scope for now — most blog visitors don't log in, and writing a `user` row per visitor (which the `anonymous` plugin would do) is wasteful for a personal blog. When a feature actually needs to track unauthenticated state across visits, the path is: HMAC-signed `visitor_id` cookie on first interaction → lazily promote to a real `user` row only when the visitor performs a persistent action → if they later complete OTP signup, the existing user row keeps its ID (no migration needed).

## Local vs remote

- `vite dev` short-circuits `authHandle` because `platform.env` is undefined. Use `just preview` for any auth-touching work.
- `just database-migrate-local` materializes the auth tables in miniflare's SQLite at `.wrangler/state/v3/d1/`.
- The catch-all returns 503 from `vite dev` so missing-binding failures surface with a clear message instead of a stack trace.

## Releasing

Same as `spec/database.md` — onboard the sending domain, replace the `database_id` placeholder, run `just database-migrate-remote`. The auth tables ship with the first remote migration.
