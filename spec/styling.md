# Styling

## Color tokens

`src/styles/tokens.css` defines two layers:

- **Physical:** Tailwind v4 built-ins (`var(--color-neutral-300)`, …). OKLCH canonical scale, untouchable.
- **Semantic:** project tokens whose values `var()` into the physical layer. Light in `@theme`, dark overrides in `.dark`. Omit the dark override when the light value works across modes.

| Token              | Light       | Dark        | Use for                                         |
| ------------------ | ----------- | ----------- | ----------------------------------------------- |
| `background`       | white       | neutral-900 | Page surface                                    |
| `foreground`       | neutral-900 | neutral-300 | Default body text                               |
| `inset`            | neutral-200 | neutral-950 | Selected state darker than background (sunken)  |
| `muted`            | neutral-100 | neutral-800 | Elevated / tinted surface (hover, raised)       |
| `muted-foreground` | neutral-500 | neutral-500 | Secondary text                                  |
| `border`           | neutral-200 | neutral-700 | Outlines that must read (buttons, inputs)       |
| `divider`          | neutral-200 | neutral-800 | Soft visual separators (nav, footer, sections)  |
| `scrollbar`        | neutral-300 | neutral-800 | Browser scrollbar thumb (via `scrollbar-color`) |
| `success`          | `#75d199`   | `#587969`   | Positive status                                 |
| `destructive`      | red-700     | red-400     | Errors                                          |
| `selection`        | `#fef9b2`   | `#4a605f`   | Text selection highlight (`::selection`)        |

**Rules:**

- Project code uses semantic tokens only (`bg-background`, `text-muted-foreground`, …). No raw `bg-neutral-900`, no hex (brand colors excepted).
- New semantics go in `tokens.css` pointing at a physical `var(--color-*)` — never a raw value.
- One-off intermediate dimming uses opacity modifiers (`text-foreground/72`), not a new token per level.
- No `dark:` prefix on semantic utilities — `@theme` redefinitions inside `.dark` auto-flip everything.

Canonical Tailwind class scale (`size-3.25` vs `size-[0.8125rem]` etc.) is enforced mechanically by `eslint-plugin-better-tailwindcss` via the lefthook `pre-commit` job.

## Styles architecture

`src/styles/app.css` is the entry point. Each file owns one concern:

| File             | Responsibility                                    |
| ---------------- | ------------------------------------------------- |
| `app.css`        | Tailwind import, `@custom-variant`, `@theme` anim |
| `tokens.css`     | Semantic color tokens (light + `.dark` overrides) |
| `base.css`       | Element baselines (`html`) and `::selection`      |
| `utilities.css`  | Reusable class primitives (`.focus-ring`)         |
| `components.css` | Scoped component patches (`.footer-icon-bold`)    |

## Focus ring

`.focus-ring` in `utilities.css` is the single source of truth for keyboard focus indication. Apply it to every interactive element.

- Uses a real CSS `outline` (not `box-shadow` / Tailwind `ring`) so `forced-colors` mode recolors it automatically.
- Default `border-radius: 4px` via `:where(.focus-ring)` — zero specificity, any explicit `rounded-*` on the same element wins.
- Color: `var(--color-blue-500)` (Tailwind's canonical blue, not a project semantic token — focus ring is "system-level feedback", not brand).
- Callers add their own `hover:text-foreground focus-visible:text-foreground` for color reinforcement; the utility only owns the outline shape.

## Browser default resets

Three resets in `base.css` prevent browser defaults from leaking through:

- **`::selection`** — uses `var(--color-selection)` token; auto-switches light/dark.
- **`-webkit-tap-highlight-color: transparent`** — suppresses the translucent flash on mobile tap. Acceptable because all interactive elements already have visible `focus-visible` + `hover` states.
- **`prefers-reduced-motion`** — Tailwind utility `motion-safe:` for CSS animations (e.g. status indicator breathe). Svelte JS transitions check `window.matchMedia('(prefers-reduced-motion: reduce)')` at transition start and degrade gracefully (drop rotation, shorten duration).

## Transitions

Hover/interactive color changes fade by default; theme swaps snap.

- **Default fade:** `base.css` sets a 120ms `color` / `background-color` / `border-color` transition on `:where(a, button, [role='button'])`. Zero specificity, so Tailwind utilities (`transition-none`, `duration-*`, `transition-transform`) override or stack freely.
- **Theme swap snaps:** all `.dark` toggles go through `applyTheme()` in `src/lib/theme/script.ts`. It injects a `* { transition: none !important }` style tag, flushes via `getComputedStyle`, then removes the suppressor on `setTimeout(fn, 1)` (next-themes pattern). Without this, every faded element would tween between the old and new theme's color variables.
- **Scope is color-only.** `transform`, `opacity`, size properties get no default transition — opt in per-element so they don't interfere with explicit Svelte in/out, keyframes, or hover animations.
- **Do not call `classList.toggle('dark', …)` directly** — always go through `applyTheme()` so the suppressor wraps the swap.

## Icons

- **Custom SVGs:** `src/lib/icons/*.svelte`, one per file, `class` prop + `fill="currentColor"` + `<title>`, no hard-coded size.
- **Lucide:** `@lucide/svelte/icons/<kebab-name>` (per-icon import).
- **FontAwesome:** `svelte-fa` + `@fortawesome/free-solid-svg-icons`.
- **Mingcute / any Iconify collection:** `unplugin-icons` + `@iconify-json/<collection>`, imported as `~icons/<collection>/<icon-name>`.
