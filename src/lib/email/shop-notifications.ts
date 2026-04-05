import 'server-only'
import sgMail from '@sendgrid/mail'

const FROM = 'Ride MTB <info@ridemtb.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function getSendGrid(): typeof sgMail | null {
  if (!process.env.SENDGRID_API_KEY) return null
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  return sgMail
}

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" style="background-color:#0f172a;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" style="max-width:600px;background-color:#1e293b;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:32px;text-align:center;">
    <h1 style="color:#22c55e;font-size:24px;margin:0 0 8px;">Ride MTB</h1>
    <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 24px;">${title}</h2>
    <div style="color:#94a3b8;font-size:14px;line-height:1.6;text-align:left;">${body}</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export async function sendClaimApprovedEmail(email: string, shopName: string, shopSlug: string) {
  const sg = getSendGrid()
  if (!sg) return

  const manageUrl = `${BASE_URL}/shops/${shopSlug}/manage`
  const html = wrapHtml('Claim Approved!', `
    <p style="color:#f1f5f9;">Your claim for <strong>${shopName}</strong> has been approved.</p>
    <p>You can now manage your shop listing — update info, add photos, respond to reviews, and track leads.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${manageUrl}" style="background-color:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Manage Your Shop</a>
    </p>
  `)

  try {
    await sg.send({ to: email, from: FROM, subject: `Claim approved: ${shopName}`, html })
  } catch (err) {
    console.error('[email] claim approved failed:', err)
  }
}

export async function sendClaimDeniedEmail(email: string, shopName: string) {
  const sg = getSendGrid()
  if (!sg) return

  const html = wrapHtml('Claim Update', `
    <p style="color:#f1f5f9;">Your claim for <strong>${shopName}</strong> was not approved at this time.</p>
    <p>If you believe this was in error, please contact us with additional proof of ownership.</p>
  `)

  try {
    await sg.send({ to: email, from: FROM, subject: `Claim update: ${shopName}`, html })
  } catch (err) {
    console.error('[email] claim denied failed:', err)
  }
}

export async function sendShopApprovedEmail(email: string, shopName: string, shopSlug: string) {
  const sg = getSendGrid()
  if (!sg) return

  const shopUrl = `${BASE_URL}/shops/${shopSlug}`
  const html = wrapHtml('Shop Listing Approved!', `
    <p style="color:#f1f5f9;">Your submission for <strong>${shopName}</strong> has been approved and is now live on Ride MTB.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${shopUrl}" style="background-color:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Your Listing</a>
    </p>
  `)

  try {
    await sg.send({ to: email, from: FROM, subject: `Shop approved: ${shopName}`, html })
  } catch (err) {
    console.error('[email] shop approved failed:', err)
  }
}

export async function sendShopRejectedEmail(email: string, shopName: string) {
  const sg = getSendGrid()
  if (!sg) return

  const html = wrapHtml('Submission Update', `
    <p style="color:#f1f5f9;">Your submission for <strong>${shopName}</strong> was not approved at this time.</p>
    <p>This may be because the listing doesn't meet our guidelines or is a duplicate. Feel free to resubmit with updated information.</p>
  `)

  try {
    await sg.send({ to: email, from: FROM, subject: `Submission update: ${shopName}`, html })
  } catch (err) {
    console.error('[email] shop rejected failed:', err)
  }
}
