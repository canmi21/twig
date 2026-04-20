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
| vite dev            | undefined   | `console.log` the OTP — copy from terminal         |
| `*.local` recipient | any         | no-op — OTP is forced to `000000`, no need to send |
| wrangler / prod     | defined     | `env.EMAIL.send({ to, from, subject, text })`      |

The binding lacks `remote: true` by default, so `wrangler dev` stubs sends locally (logs to console + writes file under `.wrangler/`). Add `"remote": true` to the binding entry if you want preview to actually deliver mail through the production service.

## Dev sign-in (`.local` convention)

`.local` is the reserved test-mailbox domain. Three guarantees in `src/lib/server/auth.ts`:

1. `generateOTP` returns `'000000'` for any `*.local` email — so the sign-in flow can be exercised end-to-end without leaving the editor.
2. `sendVerificationOTP` skips delivery for `*.local` (no MX, no point).
3. `databaseHooks.user.create.before` returns `false` for `*.local` when `env.ENVIRONMENT === 'production'`. The wrangler.jsonc default is `"production"`; the `just preview` recipe overrides via `--var ENVIRONMENT:preview` so local preview still accepts the seeds.

`src/lib/server/auth-roles.ts` is the canonical list:

| Role  | Email             | Fixed user_id                      |
| ----- | ----------------- | ---------------------------------- |
| admin | `admin@dev.local` | `a0000000000000000000000000000001` |
| user  | `user@dev.local`  | `b0000000000000000000000000000002` |

`isAdmin(userId)` checks against `ADMIN_USER_IDS`. There is no `role` column on the `user` table — when more than one human ever needs admin, promote `ADMIN_USER_IDS` to a real column rather than installing the better-auth admin plugin (which would add `role` + `banned` + `banReason` + `banExpires` + `impersonatedBy` and force a migration).

## Dev overlay & switch endpoint

`src/lib/dev/overlay/dev-overlay.svelte` is mounted from the root layout under `{#if dev}` — vite-dev-only, dead-stripped from prod bundles. Anchored to the left edge, vertically centered, collapses to a `>` handle and expands to a sidebar-tabbed panel; the Auth tab exposes three actions: Login as admin / Login as user / Sign out. See [spec/dev-routes.md](dev-routes.md) for the layout shape and how to add a new tool.

Each action POSTs to `/dev/api/auth/switch?as=admin|user|none`. The endpoint:

1. Hard-gates on `dev` from `$app/environment` (404 in prod) **and** `platform.env.DATABASE` (503 in vite-only context).
2. Lazy-seeds the target user with the canonical fixed ID if missing (`INSERT OR IGNORE`).
3. Calls `auth.api.sendVerificationOTP` (writes a verification row with `value = '000000'`).
4. Calls `auth.api.signInEmailOTP({ otp: '000000' })` and returns its Response — the Set-Cookie header carries the new session.

The explicit `just database-seed-local` recipe stays useful for vitest fixtures and bulk reseeds; the overlay path doesn't depend on it.

## Anonymous users (deferred)

Out of scope for now — most blog visitors don't log in, and writing a `user` row per visitor (which the `anonymous` plugin would do) is wasteful for a personal blog. When a feature actually needs to track unauthenticated state across visits, the path is: HMAC-signed `visitor_id` cookie on first interaction → lazily promote to a real `user` row only when the visitor performs a persistent action → if they later complete OTP signup, the existing user row keeps its ID (no migration needed).

## Local vs remote

- `vite dev` short-circuits `authHandle` because `platform.env` is undefined. Use `just preview` for any auth-touching work.
- `just database-migrate-local` materializes the auth tables in miniflare's SQLite at `.wrangler/state/v3/d1/`.
- The catch-all returns 503 from `vite dev` so missing-binding failures surface with a clear message instead of a stack trace.

## Releasing

Same as `spec/database.md` — onboard the sending domain, replace the `database_id` placeholder, run `just database-migrate-remote`. The auth tables ship with the first remote migration.
