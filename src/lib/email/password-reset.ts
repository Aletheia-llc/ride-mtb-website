import 'server-only'
import sgMail from '@sendgrid/mail'

const FROM = 'Ride MTB <info@ridemtb.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function getSendGrid(): typeof sgMail | null {
  if (!process.env.SENDGRID_API_KEY) return null
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  return sgMail
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const sg = getSendGrid()
  if (!sg) {
    console.warn('[email] SENDGRID_API_KEY not configured — password reset email not sent')
    return
  }

  const resetUrl = `${BASE_URL}/reset-password?token=${token}`

  await sg.send({
    from: FROM,
    to: email,
    subject: 'Reset your Ride MTB password',
    html: `
      <p>Hi,</p>
      <p>We received a request to reset the password for your Ride MTB account.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color:#22c55e;">${resetUrl}</a>
      </p>
    `,
  })
}
