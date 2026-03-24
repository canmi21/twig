/* drizzle.config.ts */

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/lib/database/schema.ts',
  out: './drizzle/migrations',
})
