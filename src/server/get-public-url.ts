/* src/server/get-public-url.ts */

import { createServerFn } from '@tanstack/react-start'
import { getPublicUrl } from './platform'

export const getPublicUrlFn = createServerFn().handler(() => {
  return getPublicUrl()
})
