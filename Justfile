PORT_FFONI         := "23315"
PORT_API           := "23316"
PORT_DASH          := "23317"
PORT_FFONI_PREVIEW := "4173"

_default:
    @just --list

# ───── ffoni ─────────────────────────────────────────────────────────

# Start ffoni dev server on :{{PORT_FFONI}}.
ffoni-dev:
    bun --filter ffoni dev

# Run vitest in projs/ffoni (requires dev server on :{{PORT_FFONI}} for integration tests).
ffoni-test *args:
    cd projs/ffoni && bunx vitest {{args}}

# Serve the built CF Worker bundle via miniflare on :{{PORT_FFONI_PREVIEW}}.
ffoni-preview:
    cd projs/ffoni && bunx wrangler dev .svelte-kit/cloudflare/_worker.js --port {{PORT_FFONI_PREVIEW}}

# Fast TypeScript typecheck for ffoni (.ts/.svelte only, ~1s).
ffoni-typecheck:
    cd projs/ffoni && ../../node_modules/.bin/tsc --noEmit

# Full type + a11y gate (wrangler types -> svelte-kit sync -> svelte-check).
ffoni-check:
    cd projs/ffoni && bunx wrangler types && bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json

# Watch mode for the type + a11y gate.
ffoni-check-watch:
    cd projs/ffoni && bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json --watch

# ───── api ───────────────────────────────────────────────────────────

# Start api dev server (wrangler + miniflare) on :{{PORT_API}}.
api-dev:
    bun --filter api dev

# Generate a new drizzle migration from src/db/schema.ts diffs.
api-gen:
    bun --filter api db:generate

# Apply pending migrations to the LOCAL miniflare D1.
api-migrate:
    bun --filter api db:migrate

# Wipe the local D1 file and re-apply all migrations from scratch.
api-migrate-reset:
    bun --filter api db:reset

# Apply pending migrations to the REMOTE D1 (use only when deploying).
api-migrate-prod:
    bun --filter api db:migrate:prod

# Regenerate worker-configuration.d.ts from wrangler.jsonc bindings.
api-types:
    bun --filter api types

# Print a fresh 32-byte master AES key (hex). Paste into projs/api/.dev.vars.
api-gen-master-key:
    @openssl rand -hex 32

# Generate + INSERT a new ES256 signing key into the LOCAL D1 (one-time setup).
api-bootstrap-key:
    cd projs/api && bun run scripts/bootstrap-signing-key.ts

# Same but against the REMOTE D1 (one-time, before first prod deploy).
api-bootstrap-key-prod:
    cd projs/api && bun run scripts/bootstrap-signing-key.ts --remote

# Fast TypeScript typecheck for api.
api-typecheck:
    cd projs/api && ../../node_modules/.bin/tsc --noEmit

# ───── dash ──────────────────────────────────────────────────────────

# Start dash dev server (vite) on :{{PORT_DASH}}.
dash-dev:
    bun --filter dash dev

# Fast TypeScript typecheck for dash.
dash-typecheck:
    cd projs/dash && ../../node_modules/.bin/tsc --noEmit
