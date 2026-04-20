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

## Email delivery

CF Email Service (public beta since 2026-04-16). Binding `EMAIL` (type `send_email`) is declared in `wrangler.jsonc`; from inside a Worker the call needs no API token, no account ID — auth is implicit via the binding. `EMAIL_FROM` is a plain `vars` entry, edit it there to change the sender (the address must belong to a domain onboarded in CF dash → Email Service, which auto-provisions MX/SPF/DKIM/DMARC).

`sendVerificationOTP` in `src/lib/server/auth.ts` branches three ways:

| Caller              | `env.EMAIL` | Behaviour                                          |
| ------------------- | ----------- | -------------------------------------------------- |
| `*.local` recipient | any         | no-op — OTP is forced to `000000`, no need to send |
| binding absent      | undefined   | `console.log` the OTP — copy from terminal         |
| binding present     | defined     | `env.EMAIL.send({ to, from, subject, text })`      |

The binding in `wrangler.jsonc` carries `"remote": true` — both `vite dev` and `just preview` honour that and proxy sends to the real Cloudflare Email Service (needs `wrangler login`). Everything else — D1, vars, future KV/R2 — stays miniflare-local because it has no `"remote"` flag. `svelte.config.js` leaves `remoteBindings` at its wrangler 4.x default (`true`), which is what makes the per-binding `"remote"` markers actually take effect; flipping the global to `false` would stub EMAIL via miniflare's strict MIME validator and 500 on real sends.

## Dev sign-in (`.local` convention)

`.local` is the reserved test-mailbox domain. Three guarantees in `src/lib/server/auth.ts`:

1. `generateOTP` returns `'000000'` for any `*.local` email — so the sign-in flow can be exercised end-to-end without leaving the editor.
2. `sendVerificationOTP` skips delivery for `*.local` (no MX, no point).
3. `databaseHooks.user.create.before` returns `false` for `*.local` when the caller is actually production — `!dev && env.ENVIRONMENT === 'production'`. `dev` from `$app/environment` is the authoritative local-mode signal; without it, platformProxy would surface the wrangler.jsonc `"production"` default to vite dev and misclassify local dev as prod. The `just preview` recipe still overrides via `--var ENVIRONMENT:preview` as a belt-and-suspenders.

`src/lib/server/auth-roles.ts` is the canonical list:

| Role  | Email             | Fixed user_id                      |
| ----- | ----------------- | ---------------------------------- |
| admin | `admin@dev.local` | `a0000000000000000000000000000001` |
| user  | `user@dev.local`  | `b0000000000000000000000000000002` |

`isAdmin(userId)` checks against `ADMIN_USER_IDS`. There is no `role` column on the `user` table — when more than one human ever needs admin, promote `ADMIN_USER_IDS` to a real column rather than installing the better-auth admin plugin (which would add `role` + `banned` + `banReason` + `banExpires` + `impersonatedBy` and force a migration).

## Dev overlay & switch endpoint

`src/lib/dev/overlay/dev-overlay.svelte` is mounted from the root layout under `{#if dev}` — vite-dev-only, dead-stripped from prod bundles. Anchored to the left edge, vertically centered, collapses to a `>` handle and expands to a sidebar-tabbed panel; the Auth tab exposes three actions: Login as admin / Login as user / Sign out. See [spec/dev-routes.md](dev-routes.md) for the layout shape and how to add a new tool.

Each action POSTs to `/dev/api/auth/switch?as=admin|user|none`. The endpoint:

1. Hard-gates on `dev` from `$app/environment` (404 in prod) **and** `platform.env.DATABASE` (503 if the platform proxy itself is misconfigured — the binding is expected to be present under both vite dev and `just preview`).
2. Lazy-seeds the target user with the canonical fixed ID if missing (`INSERT OR IGNORE`).
3. Calls `auth.api.sendVerificationOTP` (writes a verification row with `value = '000000'`).
4. Calls `auth.api.signInEmailOTP({ otp: '000000' })` and returns its Response — the Set-Cookie header carries the new session.

The explicit `just database-seed-local` recipe stays useful for vitest fixtures and bulk reseeds; the overlay path doesn't depend on it.

## Anonymous users (deferred)

Out of scope for now — most blog visitors don't log in, and writing a `user` row per visitor (which the `anonymous` plugin would do) is wasteful for a personal blog. When a feature actually needs to track unauthenticated state across visits, the path is: HMAC-signed `visitor_id` cookie on first interaction → lazily promote to a real `user` row only when the visitor performs a persistent action → if they later complete OTP signup, the existing user row keeps its ID (no migration needed).

## Local vs remote

- `svelte.config.js` enables adapter-cloudflare's `platformProxy` with `persist: true`, so `vite dev` gets the full local CF runtime — D1 at `.wrangler/state/v3/d1/` (shared with `just preview`), `vars` read from `wrangler.jsonc`. Auth works under vite dev; HMR stays intact.
- `just database-migrate-local` materializes the auth tables in that same miniflare SQLite. Run it once per fresh clone or reset.
- `just preview` still exists for testing the actually-built worker bundle (no HMR, closer to production); use it to verify anything that the platform proxy might fib about.
- The `send_email` binding carries `"remote": true` and both `vite dev` and `just preview` proxy sends to the real Cloudflare Email Service (requires `wrangler login`). Every other binding stays miniflare-local because it has no `"remote"` flag — the wrangler 4.x default of `remoteBindings: true` is what lets per-binding markers drive the split. `.local` addresses skip delivery entirely.

## Releasing

Same as `spec/database.md` — onboard the sending domain, replace the `database_id` placeholder, run `just database-migrate-remote`. The auth tables ship with the first remote migration.
