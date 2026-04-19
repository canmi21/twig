# Notifications

## What it is

A top-right toast stack, fed by a single global store. One place to reach it: `$lib/notification/state.svelte` exports `notifications` with `push(input)`, `dismiss(id)`, `clear()`. Kinds are `info | success | warn | error`; duration is `number` ms or `'pinned'`.

```ts
notifications.push({
	title: m['footer.greeting.invalid.title'](),
	body: m['footer.greeting.invalid.length'](),
	kind: 'error'
});
```

## When to use it

**Transient, user-action feedback that does not change the page.** Validation failures, save-failed errors, background-task results. The toast is the feedback channel — it appears, announces to assistive tech (`role="status"` / `role="alert"` via the kind mapping), and auto-dismisses.

## Rule: no inline error UI in tight layouts

Do **not** render validation or transient error state inline inside layout-sensitive UI (footer rows, inline editors, toolbar chips, anywhere text alignment or neighbor positioning matters). An inline `{#if errorMessage}<div>…</div>{/if}` expands the container's height the moment validation fails, misaligning every sibling. The footer greeting is the canonical example — a 1.25rem error line under a `text-xl` name pushes the copyright row down and breaks the dashed-divider rhythm.

Push a notification instead. The toast lives in its own fixed overlay — no reflow, no layout shift, screen-reader-announced by the notification component itself.

Inline error text is still fine in **dedicated form layouts** (settings panels, account forms) where a reserved error slot is part of the spec.

## Title + body shape

- `title` — short, past-tense or stative, describes what happened ("Name not saved", "Upload failed"). Required.
- `body` — optional, explains the fix in one short sentence ("Use 2 to 16 characters.").
- `kind` — `'error'` for validation / failure, `'warn'` for recoverable trouble, `'success'` for confirmations, `'info'` otherwise. Pick the weakest kind that still reads right; `error` is loud (assertive live region, longer default duration).
- All strings go through Paraglide `m['…']()`, never hard-coded.

## i18n key convention

`<feature>.<subject>.<outcome>.title` + sibling `<feature>.<subject>.<outcome>.<reason>` bodies. Share a title across reasons when the UX verdict is the same ("Name not saved" covers both length and chars failures). Keep the body key focused on the user-facing fix, not the internal reason code.

## Do not

- Build a second toast system. Everything routes through `notifications.push`.
- Push a toast for every keystroke. Validate on commit (Enter / blur-commit); don't surface per-keystroke errors — it's noise.
- Use `'pinned'` for validation. Validation errors self-expire; pinning is for state the user must acknowledge.
- Stack identical toasts. If the same error can fire repeatedly, dedupe at the call site (guard on a recent `id`) before adding a per-kind cooldown here.
