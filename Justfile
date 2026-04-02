# Task runner for taki
# Run `just` to list all available recipes.

set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    @just --list --unsorted

# --- Quality ---

# Format all source files
fmt:
    oxfmt --write .
    prettier --write --ignore-path /dev/null 'contents/**/*.md' 2>/dev/null || true
    chore .
    eslint . --fix > /dev/null 2>&1 || true

# Run all linters and knip
lint:
    bun run lint:oxlint
    bun run lint:eslint
    bunx knip

# Fix lint issues
lint-fix:
    bun run lint:oxlint:fix
    bun run lint:eslint:fix

# Run fmt + lint + typecheck
check: fmt lint
    bun run typecheck

# --- Content ---

# Push local content to D1/R2/KV
push:
    bun run src/cli/push/index.ts

# Pull content from D1/R2 to local
pull:
    bun run src/cli/pull/index.ts

# Recompile all posts and refresh KV cache
rebuild:
    bun run src/cli/rebuild/index.ts

# Watch content changes
watch:
    bun run src/cli/watch/index.ts

# --- Database ---

# Reset database schema
db-reset:
    bun run src/cli/db-reset/index.ts

# Seed database with initial data
db-seed:
    bun run src/cli/db-seed/index.ts

# Reset and reseed database
db-fresh: db-reset db-seed

# --- Deploy ---

# Deploy to Cloudflare Workers
deploy:
    ./scripts/deploy.sh

# Deploy with full data sync
deploy-sync:
    ./scripts/deploy.sh --sync

# --- Setup ---

# Download OG image font to public/fonts/
setup-og-font:
    mkdir -p public/fonts
    curl -fsSL -o public/fonts/lxgw-wenkai-regular.ttf \
        'https://cdn.jsdelivr.net/gh/lxgw/lxgwwenkai@5dea838/fonts/TTF/LXGWWenKai-Regular.ttf'

# --- Version ---

# Bump version: just bump [patch|minor|x.y.z]
bump level="patch":
    ./scripts/bump-version.sh {{ level }}
