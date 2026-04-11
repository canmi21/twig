/* src/vite-env.d.ts */

/// <reference types="vite/client" />

// Build-time short commit hash injected by vite define. See vite.config.ts
// for the resolution chain (VITE_GIT_COMMIT → CF_PAGES_COMMIT_SHA → git → 'dev').
declare const __APP_GIT_COMMIT__: string
