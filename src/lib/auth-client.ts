/* src/lib/auth-client.ts */

import { createAuthClient } from 'better-auth/react'
import { adminClient, emailOTPClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), adminClient()],
})
