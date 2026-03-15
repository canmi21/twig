// Re-export the default TanStack Start server entry.
// Custom fetch wrapping (e.g. R2 proxy) is handled via server functions
// to avoid Cloudflare Workers global-scope I/O restrictions.
export { default } from '@tanstack/react-start/server-entry'
