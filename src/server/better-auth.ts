/* src/server/better-auth.ts */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, emailOTP } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Resend } from 'resend'
import * as authSchema from '~/lib/database/auth-schema'
import { SITE_TITLE } from '~/lib/content/metadata'
import { newCid } from '~/lib/utils/uuid'
import {
  getDb,
  getPublicUrl,
  getBetterAuthSecret,
  getResendApiKey,
  getEmailFromNoreply,
  getEmailOwner,
  getSkipOtpVerify,
} from './platform'

const DEV_PORT = 26315

function devTrustedOrigins(): string[] {
  const hosts = ['localhost', '127.0.0.1', '[::1]']
  return hosts.map((host) => `http://${host}:${DEV_PORT}`)
}

/** Create a Better Auth instance per request (D1 binding is request-scoped). */
export function getAuth() {
  const resend = new Resend(getResendApiKey())
  const isDev = import.meta.env.DEV
  // In dev the /__dev debug dashboard signs users in by calling the
  // real OTP flow with a hardcoded code, so OTP verification must be
  // a no-op. Keep the explicit binding as an override for prod-like
  // local preview (where vite build sets isDev=false).
  const skipOtp = isDev || getSkipOtpVerify()
  const baseURL = isDev ? `http://localhost:${DEV_PORT}` : getPublicUrl()
  const fromNoreply = getEmailFromNoreply()

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'sqlite',
      schema: authSchema,
    }),
    baseURL,
    trustedOrigins: isDev ? devTrustedOrigins() : [],
    secret: getBetterAuthSecret(),
    advanced: {
      database: {
        generateId: () => newCid(),
      },
    },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            // Owner email always gets admin role
            const ownerEmail = getEmailOwner()
            if (user.email === ownerEmail) {
              return { data: { ...user, role: 'admin' } }
            }
            // Dev seed admin: the auto-login flow in src/routes/@/route.tsx
            // signs in as this fixed email so the dashboard is usable
            // without manual login. On a fresh DB the "first user"
            // bootstrap below covers it, but after `just sync-remote`
            // pulls prod data the seed account is no longer first and
            // would otherwise get the default `user` role, locking the
            // dashboard behind a 403. Pin it to admin in dev so the
            // post-sync workflow keeps working.
            if (isDev && user.email === 'admin@dev.local') {
              return { data: { ...user, role: 'admin' } }
            }
            // First registered user becomes admin (bootstrap)
            const db = getDb()
            const existing = await db
              .select({ id: authSchema.user.id })
              .from(authSchema.user)
              .limit(1)
            if (existing.length === 0) {
              return { data: { ...user, role: 'admin' } }
            }
            return { data: user }
          },
        },
      },
    },
    plugins: [
      admin({ defaultRole: 'user' }),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        // In dev with SKIP_OTP_VERIFY, any OTP input passes verification
        ...(skipOtp && {
          storeOTP: { hash: async () => 'dev-bypass' },
        }),
        async sendVerificationOTP({ email, otp, type }) {
          if (skipOtp) {
            console.log(`[dev] OTP for ${email} (${type}): ${otp}`)
            return
          }

          const publicURL = getPublicUrl()
          const domain = publicURL.replace(/^https?:\/\//, '')
          const verifyUrl = `${baseURL}/login/verify?email=${encodeURIComponent(email)}&code=${otp}`

          const subjects: Record<string, string> = {
            'sign-in': `Sign in to ${domain}`,
            'email-verification': 'Verify your email',
            'forget-password': 'Reset your password',
          }

          await resend.emails.send({
            from: `${SITE_TITLE} <${fromNoreply}>`,
            to: email,
            subject: subjects[type] ?? 'Verification code',
            html: otpEmailHtml({ otp, verifyUrl, type }),
          })
        },
      }),
      tanstackStartCookies(),
    ],
  })
}

function otpEmailHtml({
  otp,
  verifyUrl,
  type,
}: {
  otp: string
  verifyUrl: string
  type: string
}) {
  const showLink = type === 'sign-in'
  return `
<div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px 0;">
  <p style="font-size: 15px; color: #1c1c1c; margin: 0 0 24px;">Your verification code:</p>
  <p style="font-size: 32px; font-weight: 600; letter-spacing: 0.15em; color: #1c1c1c; margin: 0 0 24px;">${otp}</p>
  <p style="font-size: 13px; color: #828282; margin: 0 0 8px;">This code expires in 5 minutes.</p>
  ${
    showLink
      ? `<p style="font-size: 13px; color: #828282; margin: 16px 0 0;">Or <a href="${verifyUrl}" style="color: #1c1c1c;">click here to sign in</a>.</p>`
      : ''
  }
</div>`
}
