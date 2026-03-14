import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'

export const getPlatformStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      bindings: {
        DB: typeof env.DB !== 'undefined',
        ASSETS: typeof env.ASSETS !== 'undefined',
        CACHE: typeof env.CACHE !== 'undefined',
      },
    }
  },
)
