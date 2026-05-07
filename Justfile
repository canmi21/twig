DEV_PORT     := "23315"
PREVIEW_PORT := "4173"

_default:
    @just --list

# Run vitest in projs/ffoni (requires dev server on :{{DEV_PORT}} for integration tests).
test *args:
    cd projs/ffoni && bunx vitest {{args}}

# Serve the built CF Worker bundle via miniflare on :{{PREVIEW_PORT}}.
preview:
    cd projs/ffoni && bunx wrangler dev .svelte-kit/cloudflare/_worker.js --port {{PREVIEW_PORT}}

# Fast TypeScript typecheck for ffoni (.ts/.svelte only, ~1s).
typecheck:
    cd projs/ffoni && ../../node_modules/.bin/tsc --noEmit

# Full type + a11y gate (wrangler types -> svelte-kit sync -> svelte-check).
check:
    cd projs/ffoni && bunx wrangler types && bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json

# Watch mode for the type + a11y gate.
check-watch:
    cd projs/ffoni && bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json --watch
