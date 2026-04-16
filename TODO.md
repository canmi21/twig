# TODO

Tracked items that are in-flight or blocked on upcoming work. Items here are temporarily exempt from test coverage — they will change soon.

## Feed & Sitemap timestamps

`src/routes/feed/+server.ts` rounds `updated` to the current hour as a placeholder.
`src/routes/sitemap.xml/+server.ts` has no `<lastmod>` at all.

Once articles land, both must switch to per-route last-modified times derived from content metadata. Until then the current stubs are intentional — no point testing throwaway logic.
