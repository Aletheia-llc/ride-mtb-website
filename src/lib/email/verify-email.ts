import 'server-only'
import sgMail from '@sendgrid/mail'

const FROM = 'Ride MTB <info@ridemtb.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function getSendGrid(): typeof sgMail | null {
  if (!process.env.SENDGRID_API_KEY) return null
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  return sgMail
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const sg = getSendGrid()
  if (!sg) {
    console.warn('[email] SENDGRID_API_KEY not configured — verification email not sent')
    return
  }

  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`

  await sg.send({
    from: FROM,
    to: email,
    subject: 'Verify your Ride MTB email',
    html: `
      <p>Welcome to Ride MTB!</p>
      <p>Click the button below to verify your email address.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        If the button doesn't work, copy and paste this link:<br/>
        <a href="${verifyUrl}" style="color:#22c55e;">${verifyUrl}</a>
      </p>
    `,
  })
}
