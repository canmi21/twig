# Components & Accessibility

## Interactive primitives

All interactive primitives (dropdowns, dialogs, tooltips, popovers, toggles, tabs, selects, accordions, …) **must** come from [`bits-ui`](https://bits-ui.com). It is Svelte 5 runes-native, headless, and gets keyboard nav / focus management / WAI-ARIA correct out of the box. Don't hand-roll click-outside or arrow-key navigation — that is exactly the class of bug Bits UI exists to prevent.

- Style via Tailwind on the component's `class` prop. Bits UI exposes `data-state`, `data-highlighted`, `data-disabled`, etc. — target them with `data-highlighted:bg-muted` (Tailwind v4 dataset syntax, no brackets).
- Applying a Svelte `transition:` to `Content` / `Dialog` / `Popover` requires `forceMount` + the `child` snippet:

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

- Every `aria-label` / `aria-description` on a Bits UI trigger or content goes through Paraglide's `m['...']()`, never hard-coded English.

## Accessibility

**Mechanical gate:** `just check` runs `svelte-check`, which surfaces Svelte 5's `a11y_*` compiler warnings (~30 rules). **Zero tolerance** for any `a11y_*` warning. `eslint-plugin-svelte` v3 removed its `a11y-*` rules — don't look for them there.

Soft rules the compiler can't catch:

1. **Matching hover + focus-visible.** Pair `hover:<visual>` with an equivalent `focus-visible:<visual>` + `focus-visible:outline-none`. Use `focus-visible:` not `focus:` (avoids sticky rings after mouse click). Never `outline-none` without a replacement indicator (WCAG 2.4.7).
2. **Bits UI composite items** (`DropdownMenu.Item`, `Select.Item`, …) style via `data-highlighted:<visual>` — the library flips it on both hover and keyboard arrow nav. Plain `outline-none` is fine on these (roving tabindex, no browser default ring).
3. **Accessible name.** Visible text preferred; otherwise `aria-label` via Paraglide `m['...']()` (never hard-coded English); otherwise `aria-labelledby`. An icon-only link with no name reads as "link" in a screen reader — always a bug.
4. **Keyboard patterns are Bits UI's job.** Menus: Tab enters once, arrow keys navigate. Dialogs trap focus. Popovers don't. Don't hand-roll click-outside / Escape / focus trap.
5. **No silencing.** Never use `<!-- svelte-ignore a11y_... -->` without a comment justifying why (usually there isn't one).
