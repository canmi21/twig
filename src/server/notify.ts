/* src/server/notify.ts */

import { Resend } from 'resend'
import { SITE_TITLE } from '~/lib/content/metadata'
import {
  getPublicUrl,
  getResendApiKey,
  getEmailFromNoreply,
  getEmailOwner,
} from './platform'

export async function notifyNewComment(input: {
  postTitle: string
  postSlug: string
  postCategory: string | null
  userName: string
  userEmail: string
  content: string
}) {
  const resend = new Resend(getResendApiKey())
  const fromNoreply = getEmailFromNoreply()
  const ownerEmail = getEmailOwner()
  const publicURL = getPublicUrl()
  const domain = publicURL.replace(/^https?:\/\//, '')

  const postUrl = `${publicURL}/posts/${input.postCategory ?? 'uncategorized'}/${input.postSlug}`
  const reviewUrl = `${publicURL}/@/comments`

  const result = await resend.emails.send({
    from: `${SITE_TITLE} <${fromNoreply}>`,
    to: ownerEmail,
    subject: `New comment on "${input.postTitle}" — ${domain}`,
    html: `
<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
  <p style="font-size: 14px; color: #1c1c1c; margin: 0 0 16px;">
    <strong>${input.userName}</strong> (${input.userEmail}) commented on
    <a href="${postUrl}" style="color: #1c1c1c;">${input.postTitle}</a>:
  </p>
  <blockquote style="border-left: 2px solid #eaeaea; padding-left: 12px; margin: 0 0 16px; color: #555; font-size: 14px;">
    ${input.content.length > 500 ? `${input.content.slice(0, 500)}...` : input.content}
  </blockquote>
  <p style="font-size: 13px; margin: 0;">
    <a href="${reviewUrl}" style="color: #1c1c1c;">Review in console</a>
  </p>
</div>`,
  })
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }
}
