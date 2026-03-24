/* vitest.integration.config.ts */

import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30_000,
  },
})
