# Styling

## Color tokens

`src/styles/tokens.css` defines two layers:

- **Physical:** Tailwind v4 built-ins (`var(--color-neutral-300)`, …). OKLCH canonical scale, untouchable.
- **Semantic:** project tokens whose values `var()` into the physical layer. Light in `@theme`, dark overrides in `.dark`. Omit the dark override when the light value works across modes.

| Token              | Light       | Dark        | Use for                                          |
| ------------------ | ----------- | ----------- | ------------------------------------------------ |
| `background`       | white       | neutral-900 | Page surface                                     |
| `foreground`       | neutral-900 | neutral-300 | Default body text                                |
| `muted`            | neutral-100 | neutral-800 | Elevated / tinted surface (hover, raised, inset) |
| `muted-foreground` | neutral-500 | neutral-500 | Secondary text                                   |
| `border`           | neutral-200 | neutral-700 | Outlines that must read (buttons, inputs)        |
| `divider`          | neutral-200 | neutral-800 | Soft visual separators (nav, footer, sections)   |
| `scrollbar`        | neutral-300 | neutral-800 | Browser scrollbar thumb (via `scrollbar-color`)  |
| `success`          | `#75d199`   | `#587969`   | Positive status                                  |
| `destructive`      | red-700     | red-400     | Errors                                           |

**Rules:**

- Project code uses semantic tokens only (`bg-background`, `text-muted-foreground`, …). No raw `bg-neutral-900`, no hex (brand colors excepted).
- New semantics go in `tokens.css` pointing at a physical `var(--color-*)` — never a raw value.
- One-off intermediate dimming uses opacity modifiers (`text-foreground/72`), not a new token per level.
- No `dark:` prefix on semantic utilities — `@theme` redefinitions inside `.dark` auto-flip everything.

Canonical Tailwind class scale (`size-3.25` vs `size-[0.8125rem]` etc.) is enforced mechanically by `eslint-plugin-better-tailwindcss` via the lefthook `pre-commit` job.

## Icons

- **Custom SVGs:** `src/lib/icons/*.svelte`, one per file, `class` prop + `fill="currentColor"` + `<title>`, no hard-coded size.
- **Lucide:** `@lucide/svelte/icons/<kebab-name>` (per-icon import).
- **FontAwesome:** `svelte-fa` + `@fortawesome/free-solid-svg-icons`.
- **Mingcute / any Iconify collection:** `unplugin-icons` + `@iconify-json/<collection>`, imported as `~icons/<collection>/<icon-name>`.
