# Motion

## Three-tier preference

Every animation in the project respects a single `localStorage` key (`motion`) with three values:

| Value    | Meaning                      | Effect                                                                                                 |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `full`   | All animations play normally | No restrictions                                                                                        |
| `reduce` | Remove spatial motion        | Position / scale / rotation → instant; opacity fades and color transitions are preserved but shortened |
| `none`   | Disable everything           | All animation and transition durations → 0; instant state changes only                                 |

## Initialization

On first visit the key does not exist. The inline `<head>` script creates it:

- `prefers-reduced-motion: reduce` → writes `reduce`.
- Otherwise → writes `full`.

`none` is **never** set automatically — only by explicit user action (future UI toggle).

## Runtime access

- **CSS layer:** `<html data-motion="full|reduce|none">` is set synchronously by the inline script before first paint. A global CSS rule blanket-kills all animation and transition in `none` mode.
- **JS layer:** import `motion` from `$lib/motion/state.svelte.ts`. Use `motion.value` in Svelte transition params and conditional classes. Use `motion.set(v)` to update (persists to localStorage and syncs the data attribute).

## Per-component rules

`none` mode is handled by the global CSS rule — no per-component work needed for CSS-based animation. Svelte JS-driven transitions (`in:`, `out:`, `transition:`) must additionally pass `duration: 0` in `none` mode because Svelte's internal timer would otherwise desync from the CSS override.

`reduce` mode has no global CSS rule — it must be handled per component, since the definition of "spatial" is context-dependent. The component decides what counts as spatial motion and what counts as an acceptable fade.

## Adding a new animation

1. Make it work in `full` mode.
2. Decide whether it is spatial. If yes, disable or replace with a fade in `reduce`.
3. Verify `none` mode — the global CSS rule usually covers it; if the animation is Svelte-driven, also pass `duration: 0`.
