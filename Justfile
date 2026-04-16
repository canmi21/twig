_default:
    @just --list

# Run vitest (requires dev server on :23315 for integration tests).
test *args:
    bunx vitest {{args}}

# Serve the built CF Worker bundle via miniflare on :4173.
preview:
    bunx wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173

# Fast project-wide TypeScript typecheck (.ts only, ~1s).
typecheck:
    ./node_modules/.bin/tsc --noEmit

# Full type + a11y gate (wrangler types → svelte-kit sync → svelte-check).
check:
    bunx wrangler types --check
    bunx svelte-kit sync
    bunx svelte-check --tsconfig ./tsconfig.json

# Watch mode for the type + a11y gate.
check-watch:
    bunx svelte-kit sync
    bunx svelte-check --tsconfig ./tsconfig.json --watch
