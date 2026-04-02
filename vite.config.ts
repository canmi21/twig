/* vite.config.ts */

import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const disguise = '_next'

export default defineConfig({
  build: {
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        entryFileNames: `${disguise}/chunks/[hash:21].js`,
        chunkFileNames: `${disguise}/chunks/[hash:21].js`,
        assetFileNames: `${disguise}/static/[hash:21].[ext]`,
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
  ssr: {
    optimizeDeps: {
      exclude: ['@cf-wasm/resvg'],
      include: ['satori'],
    },
  },
  server: {
    port: 26315,
  },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    react(),
  ],
})
