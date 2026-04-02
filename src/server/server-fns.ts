/* src/server/server-fns.ts */

import { createServerFn } from '@tanstack/react-start'
import { getCdnUrl, getPublicUrl } from './platform'

export const getCdnPublicUrl = createServerFn().handler(() => {
  return getCdnUrl()
})

export const getPublicUrlFn = createServerFn().handler(() => {
  return getPublicUrl()
})
