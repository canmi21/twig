// Hostnames the article renderer treats as same-site when deciding whether
// an <a> opens in-place or in a new tab. Populated at build time via Vite
// `define` (see `spec/build.md` and `resolveSafeDomains` in vite.config.ts);
// changing the list requires a redeploy, which is intentional — the list
// is security-relevant (governs `rel="noopener"` emission) and belongs in
// version control rather than runtime state. Render-side consumption
// (hostname lookup, rel/target emission) lands in R1.
export const SAFE_DOMAINS: readonly string[] = __SAFE_DOMAINS__;
