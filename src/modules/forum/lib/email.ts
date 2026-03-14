import 'server-only'
import sgMail from '@sendgrid/mail'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getSendGrid(): typeof sgMail | null {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not configured — email notifications disabled')
    return null
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  return sgMail
}

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
  const sg = getSendGrid()
  if (!sg) return

  const threadUrl = `${BASE_URL}/forum/thread/${threadSlug}`
  const greeting = toName ? `Hi ${escapeHtml(toName)},` : 'Hi,'

  await sg.send({
    from: FROM,
    to: toEmail,
    subject: `New reply in "${escapeHtml(threadTitle)}"`,
    html: `
      <p>${greeting}</p>
      <p><strong>${escapeHtml(replierName)}</strong> replied to your thread <strong>&ldquo;${escapeHtml(threadTitle)}&rdquo;</strong> on Ride MTB.</p>
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
  const sg = getSendGrid()
  if (!sg) return

  const threadUrl = `${BASE_URL}/forum/thread/${threadSlug}`
  const greeting = toName ? `Hi ${escapeHtml(toName)},` : 'Hi,'

  await sg.send({
    from: FROM,
    to: toEmail,
    subject: `${escapeHtml(mentionerName)} mentioned you on Ride MTB`,
    html: `
      <p>${greeting}</p>
      <p><strong>${escapeHtml(mentionerName)}</strong> mentioned you in <strong>&ldquo;${escapeHtml(threadTitle)}&rdquo;</strong>.</p>
      <p><a href="${threadUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">View Post</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">You can turn off email notifications in your <a href="${BASE_URL}/profile/settings">profile settings</a>.</p>
    `,
  })
}
