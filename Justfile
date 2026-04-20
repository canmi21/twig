DEV_PORT     := "23315"
PREVIEW_PORT := "4173"

_default:
    @just --list

# Run vitest (requires dev server on :{{DEV_PORT}} for integration tests).
test *args:
    bunx vitest {{args}}

# Serve the built CF Worker bundle via miniflare on :{{PREVIEW_PORT}}.
preview:
    bunx wrangler dev .svelte-kit/cloudflare/_worker.js --port {{PREVIEW_PORT}}

# Fast project-wide TypeScript typecheck (.ts only, ~1s).
typecheck:
    ./node_modules/.bin/tsc --noEmit

# Full type + a11y gate (wrangler types → svelte-kit sync → svelte-check).
check:
    bunx wrangler types
    bunx svelte-kit sync
    bunx svelte-check --tsconfig ./tsconfig.json

# Watch mode for the type + a11y gate.
check-watch:
    bunx svelte-kit sync
    bunx svelte-check --tsconfig ./tsconfig.json --watch

# Generate a SQL migration in database/migrations/ from current schema.ts.
database-generate *args:
    bunx drizzle-kit generate {{args}}

# Apply pending migrations to the local miniflare D1 (under .wrangler/state/).
database-migrate-local:
    bunx wrangler d1 migrations apply DATABASE --local

# Apply pending migrations to the remote prod D1. Destructive — confirm first.
database-migrate-remote:
    bunx wrangler d1 migrations apply DATABASE --remote

# Drop and recreate the local miniflare D1. Useful when a schema change is
# easier to re-baseline than to migrate forward during early development.
database-reset-local:
    rm -rf .wrangler/state/v3/d1
    just database-migrate-local
