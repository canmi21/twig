/* src/worker-entry.ts */

/* src/worker-entry.ts
 *
 * Custom Worker entry point. Re-exports the TanStack Start server
 * handler and additionally exports Durable Object classes so the
 * CF runtime can instantiate them.
 */

export { default } from '@tanstack/react-start/server-entry'
export { PresenceDO } from './server/presence'
