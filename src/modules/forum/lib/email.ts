import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Ride MTB <notifications@ride-mtb.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

interface ReplyNotificationInput {
  toEmail: string
  toName: string | null
  replierName: string
  threadTitle: string
  threadSlug: string
  emailNotifications: boolean
}

interface MentionNotificationInput {
  toEmail: string
  toName: string | null
  mentionerName: string
  threadTitle: string
  threadSlug: string
  emailNotifications: boolean
}

export async function sendReplyNotification({
  toEmail,
  toName,
  replierName,
  threadTitle,
  threadSlug,
  emailNotifications,
}: ReplyNotificationInput): Promise<void> {
  if (!emailNotifications) return

  const threadUrl = `${BASE_URL}/forum/thread/${threadSlug}`
  const greeting = toName ? `Hi ${toName},` : 'Hi,'

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `New reply in "${threadTitle}"`,
    html: `
      <p>${greeting}</p>
      <p><strong>${replierName}</strong> replied to your thread <strong>"${threadTitle}"</strong> on Ride MTB.</p>
      <p><a href="${threadUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">View Thread</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">You can turn off email notifications in your <a href="${BASE_URL}/profile/settings">profile settings</a>.</p>
    `,
  })
}

export async function sendMentionNotification({
  toEmail,
  toName,
  mentionerName,
  threadTitle,
  threadSlug,
  emailNotifications,
}: MentionNotificationInput): Promise<void> {
  if (!emailNotifications) return

  const threadUrl = `${BASE_URL}/forum/thread/${threadSlug}`
  const greeting = toName ? `Hi ${toName},` : 'Hi,'

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${mentionerName} mentioned you on Ride MTB`,
    html: `
      <p>${greeting}</p>
      <p><strong>${mentionerName}</strong> mentioned you in <strong>"${threadTitle}"</strong>.</p>
      <p><a href="${threadUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">View Post</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">You can turn off email notifications in your <a href="${BASE_URL}/profile/settings">profile settings</a>.</p>
    `,
  })
}
