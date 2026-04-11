/* vite.config.ts */

import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const disguise = '_next'

// Resolve the full commit sha at build time. The client renders a short
// form (first 7 chars) but keeps the full value so the GitMerge link can
// deep-link to the exact commit on GitHub. Priority:
// 1. VITE_GIT_COMMIT — explicit manual override (any length).
// 2. CF_PAGES_COMMIT_SHA — injected by Cloudflare Pages/Workers builds.
// 3. `git rev-parse HEAD` — local dev / generic CI fallback.
// 4. 'dev' — when git is unavailable (e.g. sandboxed build containers).
function resolveGitCommit(): string {
  const override = process.env.VITE_GIT_COMMIT?.trim()
  if (override) return override
  const cfSha = process.env.CF_PAGES_COMMIT_SHA?.trim()
  if (cfSha) return cfSha
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

const gitCommit = resolveGitCommit()

export default defineConfig({
  define: {
    __APP_GIT_COMMIT__: JSON.stringify(gitCommit),
  },
  build: {
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        entryFileNames: `${disguise}/chunks/[hash:21].js`,
        chunkFileNames: `${disguise}/chunks/[hash:21].js`,
        assetFileNames: `${disguise}/chunks/[hash:21].[ext]`,
        hashCharacters: 'hex',
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom)\//,
            },
          ],
        },
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ['@cloudflare/pages-plugin-vercel-og/api'],
  },
  ssr: {
    optimizeDeps: {
      exclude: ['@cloudflare/pages-plugin-vercel-og/api'],
    },
  },
  server: {
    port: 26315,
  },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({ serverFns: { base: `/${disguise}` } }),
    react(),
  ],
})
