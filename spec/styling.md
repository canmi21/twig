# Styling

## Color tokens

Three layers, each with a single responsibility:

- **Physical (external):** Tailwind v4 built-ins (`var(--color-neutral-300)`, `var(--color-blue-500)`, …). OKLCH canonical scale, untouchable.
- **Palette (project):** `src/styles/palette.css` — the **single source of truth** for every hex literal in the project. Grouped by external reference (`--palette-nord-*` follows the official nord0..nord10 numbering) or by ramp position (`--palette-mono-0..12` runs black → white). Consumed by both `tokens.css` and `src/lib/theme/palettes.ts`.
- **Semantic (project):** project tokens in `tokens.css` whose values `var()` into either the physical or palette layer. Light in `@theme`, dark overrides in `.dark`. Omit the dark override when the light value works across modes.

| Token              | Light                | Dark                | Use for                                         |
| ------------------ | -------------------- | ------------------- | ----------------------------------------------- |
| `background`       | white                | neutral-900         | Page surface                                    |
| `foreground`       | neutral-900          | neutral-300         | Default body text                               |
| `inset`            | neutral-200          | neutral-950         | Selected state darker than background (sunken)  |
| `muted`            | neutral-100          | neutral-800         | Elevated / tinted surface (hover, raised)       |
| `muted-foreground` | neutral-500          | neutral-500         | Secondary text                                  |
| `border`           | neutral-200          | neutral-700         | Outlines that must read (buttons, inputs)       |
| `border-strong`    | neutral-400          | neutral-500         | Input focus border (see `.focus-input`)         |
| `divider`          | neutral-200          | neutral-800         | Soft visual separators (nav, footer, sections)  |
| `scrollbar`        | neutral-300          | neutral-800         | Browser scrollbar thumb (via `scrollbar-color`) |
| `success`          | twig-success-light   | twig-success-dark   | Positive status                                 |
| `destructive`      | red-700              | red-400             | Errors                                          |
| `selection`        | twig-selection-light | twig-selection-dark | Text selection highlight (`::selection`)        |

**Rules:**

- Project code uses semantic tokens only (`bg-background`, `text-muted-foreground`, …). No raw `bg-neutral-900`, no hex (brand colors excepted).
- New semantics go in `tokens.css` pointing at a physical `var(--color-*)` or a palette `var(--palette-*)` — never a raw hex value.
- New hex values go in `palette.css` first. If the value is drawn from an external palette (Nord, Geist, Material, …), name it after that source's canonical scale; otherwise name it `--palette-twig-*`.
- One-off intermediate dimming uses opacity modifiers (`text-foreground/72`), not a new token per level.
- No `dark:` prefix on semantic utilities — `@theme` redefinitions inside `.dark` auto-flip everything.

Canonical Tailwind class scale (`size-3.25` vs `size-[0.8125rem]` etc.) is enforced mechanically by `eslint-plugin-better-tailwindcss` via the lefthook `pre-commit` job.

## Styles architecture

`src/styles/app.css` is the entry point. Each file owns one concern:

| File             | Responsibility                                    |
| ---------------- | ------------------------------------------------- |
| `app.css`        | Tailwind import, `@custom-variant`, `@theme` anim |
| `palette.css`    | Canonical hex values (`--palette-*`)              |
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

Two variants cover every focusable element with no visible border of its own:

| Class               | Offset | Use for                                                       |
| ------------------- | ------ | ------------------------------------------------------------- |
| `.focus-ring`       | `+2px` | Focusable element itself                                      |
| `.focus-ring-inner` | `+2px` | Composite button — ring hugs a marked child, not the hit area |

**Elements that already render their own visible 2px border** (e.g. card previews in `card-frame.svelte`) don't use either utility — they recolor their own border to `var(--color-blue-500)` on `:focus-visible`, plus a `outline: 2px solid transparent` stub for `forced-colors`. Stacking a negative-offset outline over an existing border makes Chromium/WebKit reconcile two corner-radii on every paint and can briefly render a 1-frame "too large" ring during Tab transitions; recoloring the already-rendered border has no geometry to resolve.

## Text inputs

`<input>` and `<textarea>` follow a two-channel focus pattern via `.focus-input` (in `utilities.css`):

- **Mouse / touch focus** — border shifts to `border-strong`. No blue ring — it would compete with the surrounding UI every time the author clicks a field.
- **Keyboard focus** — the blue ring layers on top of the border change.

```html
<input class="focus-input rounded-md border border-border bg-background px-2 py-1" />
```

Note: **no `.focus-ring` on text inputs.** Browsers apply `:focus-visible` to text inputs on mouse click too (spec: users must see the caret), so `.focus-ring:focus-visible` would fire on mouse. `.focus-input` keeps its own ring rule gated on `html[data-focus-source="kbd"]`, a root attribute stamped by `$lib/client/focus-source` via `keydown` (Tab / arrows / Enter / Space) vs `mousedown` / `pointerdown` / `touchstart`. Buttons, links, and other non-text-input elements continue to use `.focus-ring` as normal — `:focus-visible` correctly skips them on mouse.

Inline editors that render no border of their own (e.g. `greeting-name.svelte`) need their own keyboard-source detection; they stay out of `.focus-input` and keep their bespoke logic.

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

## Typography

English font faces ship from Google Fonts (`src/lib/font/script.ts`). CJK faces (`src/lib/font/cjk-script.ts`) live on two CDNs:

- **Noto Sans SC/TC/JP** — Google Fonts, always-latest.
- **LXGW WenKai** — CMBill's `cn-font-split` chunked packages on jsDelivr. Pinned to patch:
  - SC: `@callmebill/lxgw-wenkai-web@1.522.0`
  - TC: `lxgw-wenkai-tc-web@1.320.0`
  - JP slot uses Google Fonts **Klee One** (LXGW was derived from it and ships no JP face).

Bumping LXGW means updating the `LXGW_SC_BASE` / `LXGW_TC_BASE` constants in `cjk-script.ts` and this note in the same commit. Never use `@latest` or float a minor — stale chunks cascade across 221 unicode-range files and are painful to debug.

LXGW ships static weights (`light`, `regular`, `medium`) as separate `@font-face` bundles; each weight's stylesheet is only loaded when an element actually requests that weight, so `font-light` / `font-medium` usage triggers the fetch lazily. Variable English fonts (Inter, Roboto, Source Sans 3) are one file per family.

Font stack ordering (`html` / `:lang()` in `base.css`) is: English face → current-language CJK → coexisting fallback CJK. SC and TC are never loaded together (same CJK-unified code points, conflicting glyphs); JP pairs with whichever Chinese script the page is in.

Code faces (`src/lib/font/code-script.ts`) auto-apply to `<pre>`, `<code>`, and anything opted in via `.font-code`:

- **JetBrains Mono / Fira Code** — Google Fonts, `wght@400;700`.
- **Maple Mono** — Fontsource on jsDelivr, pinned to patch (`@fontsource/maple-mono@5.2.6`). 400 and 700 are separate stylesheets (`latin-400.css`, `latin-700.css`); both ship at route time but neither actually fetches woff2 until a glyph renders at that weight. Bump the version in `code-script.ts` and this note in one commit.

`Monospace` is the no-network default (CSS generic only), matching the `System` role in the Latin / CJK selectors.

Emoji faces (`src/lib/font/emoji-script.ts`) attach at the tail of every `html` / `:lang()` stack, followed by explicit OS emoji fallbacks (`'Apple Color Emoji'`, `'Segoe UI Emoji'`, `'Noto Color Emoji'`) so `System` is deterministic without loading anything:

- **Twemoji** — `twemoji-colr-font@15.0.3` on jsDelivr (Tilman Vatteroth's upstream-tracking COLR/CPAL build; Mozilla's own repo only ships the `.ttf` as a GitHub release artifact, which jsDelivr doesn't mirror). One woff2, no subset split.
- **Noto Color Emoji** — Google Fonts, served as a single face (not subsetted — emoji presentation sequences must stay intact across code points).

No Fluent option: Microsoft ships Fluent Emoji as SVG/PNG assets only, with no official web font. Supporting it would require a DOM-rewriting pipeline (walk text nodes, swap emoji codepoints for `<img>` tags), which is a different architecture from the three font-stack–based selectors; the ROI didn't justify it.

The Latin and code slots use `--font-latin` and `--font-code` respectively, **not** `--font-sans` / `--font-mono`. Tailwind v4 pre-declares those two variables on `:root` to drive `.font-sans` / `.font-mono` utilities; overloading them would make `var(--font-sans, __unset)` never fall through to `__unset`, leaking Tailwind's full generic stack (including `ui-sans-serif`, which OS-level CJK fallback treats as a CJK face) ahead of our specific face. Keep our slot variables outside that namespace. `--font-emoji` follows the same rule (Tailwind doesn't reserve it today, but staying in our own namespace is cheap insurance).

## Icons

- **Custom SVGs:** `src/lib/icons/*.svelte`, one per file, `class` prop + `fill="currentColor"` + `<title>`, no hard-coded size.
- **Lucide:** `@lucide/svelte/icons/<kebab-name>` (per-icon import).
- **FontAwesome:** `svelte-fa` + `@fortawesome/free-solid-svg-icons`.
- **Mingcute / any Iconify collection:** `unplugin-icons` + `@iconify-json/<collection>`, imported as `~icons/<collection>/<icon-name>`.
