import 'server-only'
import sgMail from '@sendgrid/mail'

const FROM = 'Ride MTB <info@ridemtb.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function getSendGrid(): typeof sgMail | null {
  if (!process.env.SENDGRID_API_KEY) return null
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  return sgMail
}

function buildVerificationEmailHtml(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verify your Ride MTB email</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <!-- Outer wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0f172a;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#1e293b;border-radius:16px;overflow:hidden;">

          <!-- Green top bar -->
          <tr>
            <td style="background-color:#22c55e;height:5px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 24px 40px;">
              <!-- Logo wordmark -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Ride</span>
                    <span style="font-size:28px;font-weight:800;color:#22c55e;letter-spacing:-0.5px;">&nbsp;MTB</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Icon -->
          <tr>
            <td align="center" style="padding:0 40px 8px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="width:80px;height:80px;background-color:#0f172a;border-radius:50%;">
                    <span style="font-size:40px;line-height:80px;display:block;">&#x1F6B5;</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding:24px 40px 12px 40px;">
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.3px;">
                Verify your email,<br/>then let&rsquo;s ride.
              </h1>
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td align="center" style="padding:0 40px 32px 40px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#94a3b8;max-width:420px;">
                You&rsquo;re one step away from joining the best mountain biking community on the web.
                Click below to confirm your email and get started.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:0 40px 40px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#22c55e;">
                    <a href="${verifyUrl}"
                       target="_blank"
                       style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;border-radius:10px;background-color:#22c55e;">
                      Verify Email &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #334155;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <a href="${verifyUrl}" style="font-size:12px;color:#22c55e;word-break:break-all;">${verifyUrl}</a>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td align="center" style="padding:0 40px 16px 40px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                This link expires in <strong style="color:#94a3b8;">24 hours</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:16px 40px 36px 40px;background-color:#0f172a;border-radius:0 0 16px 16px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                If you didn&rsquo;t create an account, you can safely ignore this email.<br/>
                &mdash; The Ride MTB Team
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`
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
    subject: 'Verify your email, then let\'s ride. — Ride MTB',
    html: buildVerificationEmailHtml(verifyUrl),
    text: `Welcome to Ride MTB!\n\nVerify your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.\n— The Ride MTB Team`,
  })
}
