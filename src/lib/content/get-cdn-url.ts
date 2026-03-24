/* src/lib/content/get-cdn-url.ts */

import { createServerFn } from '@tanstack/react-start'
import { getEnv } from './env'

export const getCdnPublicUrl = createServerFn().handler(() => {
  const { CDN_PUBLIC_URL } = getEnv()
  return CDN_PUBLIC_URL
})
