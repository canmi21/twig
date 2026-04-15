# CLAUDE.md

twig — SvelteKit app on Cloudflare Workers.

## Stack

Node 25 (dev/build) → CF Workers prod via `@sveltejs/adapter-cloudflare`. Bun is installer only, never runtime. Dev server on `http://localhost:23315`. Prettier + ESLint (+ `eslint-plugin-better-tailwindcss`). Husky `commit-msg` hook with commitlint.

## Conventions

- **Chat:** Simplified Chinese. **Code / commits / docs-in-repo:** English.
- **Filenames:** kebab-case, including component files. SvelteKit `+`-prefixed files keep their prescribed names.

## Commit workflow

Reflex rules (no debate — just do it):

1. **Before every commit:** `bun run fmt` (Prettier write-in-place; never `--check`).
2. **If `better-tailwindcss/enforce-canonical-classes` warns:** `bunx eslint . --fix` (autofix rewrites `size-[0.8125rem]` → `size-3.25` etc. — always behavior-preserving).

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/); exact rules live in `commitlint.config.js` and are enforced by the husky hook. When the user says "commit this" without a message, write one that passes.

## Color tokens

All colors live in `src/styles/tokens.css` as two layers:

- **Physical:** Tailwind v4 built-ins (`var(--color-neutral-300)`, `var(--color-red-400)`, …). OKLCH canonical scale, untouchable.
- **Semantic:** project tokens whose values are `var()` refs into the physical layer — never raw hex (brand colors excepted). Light in `@theme`, dark overrides in `.dark`. Omit the dark override when the light value works across modes.

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

**Hard rule:** project code uses semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, …). No raw `bg-neutral-900`, no hex. New semantics go in `tokens.css` pointing at a physical `var(--color-*)`. For one-off intermediate dimming use opacity modifiers (`text-foreground/72`) — don't add a token per level.

`@theme` emits CSS vars at runtime, so redefining inside `.dark` auto-flips all utilities — **no `dark:` prefixes needed on semantic utilities**.

## Interactive primitives (Bits UI)

All interactive component primitives (dropdowns, dialogs, tooltips, popovers, toggles, tabs, selects, accordions, …) **must** come from [`bits-ui`](https://bits-ui.com). It's Svelte 5 runes-native, headless (unstyled), and gets keyboard nav / focus management / WAI-ARIA correct out of the box. Don't hand-roll these — hand-rolling `click-outside` and arrow-key nav is exactly the class of bug Bits UI exists to prevent.

- Style via Tailwind on the component's `class` prop; Bits UI exposes `data-state`, `data-highlighted`, `data-disabled` etc. which you target with `data-highlighted:bg-muted` etc. (Tailwind v4 dataset syntax without brackets).
- To apply a Svelte `transition:` on a Content / Dialog / Popover, use `forceMount` + the `child` snippet. Pattern:
  ```svelte
  <DropdownMenu.Content forceMount>
  	{#snippet child({ wrapperProps, props, open })}
  		{#if open}
  			<div {...wrapperProps}>
  				<div {...props} transition:fade>…</div>
  			</div>
  		{/if}
  	{/snippet}
  </DropdownMenu.Content>
  ```
- Every aria-label / aria-description on a Bits UI trigger or content should go through Paraglide's `m['...']()`, not hard-coded English. Treat the fact that Bits UI surfaces these props as an active nudge to translate them — don't skip.

## Icons

Custom SVGs → `src/lib/icons/*.svelte`, one per file, `class` prop + `fill="currentColor"` + `<title>`, no hard-coded size.

Third-party sets:

- **Lucide:** `@lucide/svelte` (per-icon: `@lucide/svelte/icons/<kebab-name>`).
- **FontAwesome:** `svelte-fa` + `@fortawesome/free-solid-svg-icons`.
- **Mingcute (or any Iconify collection):** `unplugin-icons` + `@iconify-json/<collection>`, import as `~icons/<collection>/<icon-name>`.

## Build-time constants

Values that are fixed per deployment go through Vite `define` in `vite.config.ts`, not through `platform.env` — there's no reason to pay a runtime lookup for something that was known at build. Each constant is declared ambiently in `src/app.d.ts` so it types as a plain global.

| Constant             | Resolved from (priority)                     | Fallback       |
| -------------------- | -------------------------------------------- | -------------- |
| `__APP_GIT_COMMIT__` | `VITE_GIT_COMMIT` env → `git rev-parse HEAD` | `'dev'`        |
| `__PUBLIC_URL__`     | `PUBLIC_URL` env                             | hard-coded URL |

- Use the constant directly in `.svelte` / `.ts` files — no import needed.
- `'dev'` is the commit sentinel: link to repo root, not `/commit/dev`.
- To override at build/deploy: `PUBLIC_URL=https://preview.example.com bun run build`.
- Adding a new constant: write a `resolveX()` in `vite.config.ts`, add to `define`, add one line to the `declare global` block in `src/app.d.ts`.

## i18n (Paraglide)

Message sources live under `messages/{locale}.json`. Compiled output is `src/lib/paraglide/` (gitignored). Keys use `a.b.c` dot notation as visual namespaces (accessed via bracket: `m['footer.greeting']({...})`, not `m.footer.greeting()` — dots aren't real nesting, they're part of the flat key).

### Locale roles

| Locale | Role                                                                                                         | Style                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mw`   | **Design reference.** The locale the author writes the UI in; also the `baseLocale` Paraglide falls back to. | Loose, playful, mixed English + CJK, not-quite-serious.                                                                                                     |
| `en`   | Proper English.                                                                                              | Standard, neutral.                                                                                                                                          |
| `zh`   | Proper Simplified Chinese.                                                                                   | Standard, neutral.                                                                                                                                          |
| `tw`   | Proper Traditional Chinese. **Must use 繁體 characters** — never simplified.                                 | Standard, neutral.                                                                                                                                          |
| `ja`   | Japanese.                                                                                                    | **Cute / casual register** — hiragana-leaning, casual sentence-enders (〜 / よ / ね), avoid stiff formal endings like です／ます where a lighter form fits. |

### Translation rules

- **Not 1:1.** Translate the _meaning_, not the words. Adapt to each language's natural idiom.
- **Length matches `mw`.** Because the author designs UIs against `mw`, other locales should aim for **similar rendered width** when the text is user-visible (CJK chars ~2× the width of Latin chars at the same text size, so compensate in char count). When `mw` says `小站已经活了 {days} 天`, English needs more words to fill the same pixel width; when `mw` says `Hi, {name}`, English stays equally short.
- **Aria labels / tooltips / screen-reader-only strings** don't count toward the length rule — translate them purely for correctness and natural tone.
- **New message key workflow:** add it to **all** locale files in the same commit. Never ship a key that only exists in `mw`. When adding, cross-check against the length rule for every user-visible string.

## Git

Remote `origin` → `github.com/canmi21/taki`. Working branch: **`twig`** (not `main` — taken by another project on the same remote). No force-push without explicit instruction.
