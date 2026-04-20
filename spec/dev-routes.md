# Dev routes

A sandbox tree at `/dev/*` for manual component exercises — trigger toasts, tweak knobs, eyeball motion tiers. Dev-server only; production returns 404.

## Gate

`src/routes/dev/+layout.server.ts` reads `dev` from `$app/environment` and calls `error(404)` when false. `export const prerender = false` keeps the gate authoritative — nothing under `/dev/*` can be baked into static output. The page modules still ship in the production bundle; the gate is runtime, not build-time. If bundle size ever matters, swap this for a Vite plugin that strips `routes/dev/` at `mode === 'production'`.

## i18n exemption

Strings authored **inside `/dev/*` pages** don't need Paraglide messages. Hardcoded English (or anything) is fine — these pages exist to poke at components, not to ship UI.

The exemption is boundary-local. A component imported by `/dev/*` that also renders on a real route still follows [spec/i18n.md](i18n.md) for every user-facing string. The dev page is one more consumer, not a licence for the component to hardcode.

## Conventions

- Sub-routes are plain `/dev/<feature>/` (e.g. `/dev/notification/`). No further groups or prefixes.
- Not linked from production navigation — the URL is typed, not discovered.
- Folder name must be `dev/`, not `_dev` or `__dev` — SvelteKit's router treats leading-underscore directories as private and skips them.

## Dev API endpoints

`+server.ts` files under `/dev/api/*` don't inherit the `+layout.server.ts` 404 — layout loads run for pages, not endpoints. Each dev endpoint must self-gate with `if (!dev) error(404)` (importing `dev` from `$app/environment`). See `src/routes/dev/api/auth/switch/+server.ts` for the canonical shape.

## DevOverlay

Two files, one responsibility split. The **dock shell** (`src/lib/dev/dock/dev-dock.svelte`) owns chrome, edge snap, and persistence; it takes a `tools` array and a `panel` snippet and renders the rest. The **overlay** (`src/lib/dev/overlay/dev-overlay.svelte`) is mounted from the root layout under `{#if dev}` and supplies the tool list plus the panel body — currently one tool, Auth (admin / user / sign-out, see [spec/auth.md](auth.md)).

Collapsed to a vertically-centred edge handle. Expanded into a fixed 64×72 panel split into a 9-wide icon-nav column and a content pane. The nav footer exposes two controls: snap to the opposite edge (left ↔ right), and collapse. `sessionStorage` key `twig:dev-dock` persists `{ open, active, edge }`; invalid or stale `active` ids fall back to the first tool. Hydration is deferred via a `hydrated` flag so SSR output stays stable and the initial effect never clobbers the stored state.

Add a new tool by appending an entry to the `TOOLS` array in the overlay and a matching `{#if active === '<id>'}` branch inside the `panel` snippet.
