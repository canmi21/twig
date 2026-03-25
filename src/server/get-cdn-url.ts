/* src/server/get-cdn-url.ts */

import { createServerFn } from '@tanstack/react-start'
import { getCdnUrl } from './platform'

export const getCdnPublicUrl = createServerFn().handler(() => {
  return getCdnUrl()
})
