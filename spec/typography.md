# Typography

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
