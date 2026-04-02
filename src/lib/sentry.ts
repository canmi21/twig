/* src/lib/sentry.ts */

import * as Sentry from '@sentry/react'

if (typeof window !== 'undefined') {
  Sentry.init({
    dsn: 'https://e554a978139c602f117d1a310fb4a8e2@o4511131162116096.ingest.us.sentry.io/4511131164868608',
    sendDefaultPii: true,
  })
}

export { Sentry }
