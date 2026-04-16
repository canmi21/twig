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

1. **Focus ring.** Every interactive element gets the `.focus-ring` class (see `spec/styling.md`). Pair with `hover:text-foreground focus-visible:text-foreground` for color reinforcement. Never use bare `focus-visible:outline-none` — that removes the indicator without replacing it (WCAG 2.4.7).
2. **Bits UI composite items** (`DropdownMenu.Item`, `Select.Item`, …) style via `data-highlighted:<visual>` — the library flips it on both hover and keyboard arrow nav. Plain `outline-none` is fine on these (roving tabindex, no browser default ring).
3. **Bits UI composite containers** (`DropdownMenu.Content`, `Popover.Content`, …) receive programmatic focus when the widget opens. Add `outline-none` to the content's inner div — visible focus belongs on items via `data-highlighted`, not on the container.
4. **Accessible name.** Visible text preferred; otherwise `aria-label` via Paraglide `m['...']()` (never hard-coded English); otherwise `aria-labelledby`. An icon-only link with no name reads as "link" in a screen reader — always a bug.
5. **Keyboard patterns are Bits UI's job.** Menus: Tab enters once, arrow keys navigate. Dialogs trap focus. Popovers don't. Don't hand-roll click-outside / Escape / focus trap.
6. **No silencing.** See `spec/comments.md` — svelte-ignore directives.
