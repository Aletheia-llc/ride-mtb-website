import 'server-only'
import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

const FROM = 'Ride MTB <notifications@ride-mtb.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json({ status: 'skipped', reason: 'SENDGRID_API_KEY not configured' })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  // eslint-disable-next-line no-restricted-imports
  const { db } = await import('@/lib/db/client')

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Query unread notifications from the past week for users who want email digests,
  // joining through the user relation to filter on emailNotifications.
  const recentNotifications = await db.notification.findMany({
    where: {
      read: false,
      createdAt: { gte: oneWeekAgo },
      user: { emailNotifications: true },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      message: true,
      linkUrl: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Group notifications by user
  const byUser = new Map<string, {
    user: { id: string; name: string | null; email: string }
    notifications: Array<{ id: string; title: string; message: string; linkUrl: string | null; createdAt: Date }>
  }>()

  for (const notif of recentNotifications) {
    const uid = notif.userId
    if (!byUser.has(uid)) {
      byUser.set(uid, { user: notif.user, notifications: [] })
    }
    const entry = byUser.get(uid)!
    if (entry.notifications.length < 10) {
      entry.notifications.push({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        linkUrl: notif.linkUrl,
        createdAt: notif.createdAt,
      })
    }
  }

  let emailsSent = 0
  const errors: string[] = []

  for (const { user, notifications } of byUser.values()) {
    if (!user.email || notifications.length === 0) continue

    const greeting = user.name ? `Hi ${escapeHtml(user.name)},` : 'Hi,'
    const count = notifications.length
    const notifItems = notifications
      .map((n) => {
        const link = n.linkUrl ? `${BASE_URL}${n.linkUrl}` : `${BASE_URL}/notifications`
        return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <a href="${link}" style="font-weight:600;color:#22c55e;text-decoration:none;">${escapeHtml(n.title)}</a>
            <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${escapeHtml(n.message)}</p>
          </td>
        </tr>`
      })
      .join('')

    const html = `
      <p>${greeting}</p>
      <p>You have <strong>${count} unread notification${count !== 1 ? 's' : ''}</strong> from this week on Ride MTB:</p>
      <table style="width:100%;border-collapse:collapse;">
        ${notifItems}
      </table>
      <p style="margin-top:24px;">
        <a href="${BASE_URL}/notifications" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">
          View All Notifications
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        You can turn off email notifications in your
        <a href="${BASE_URL}/profile/settings">profile settings</a>.
      </p>
    `

    try {
      await sgMail.send({
        from: FROM,
        to: user.email,
        subject: `Your Ride MTB weekly digest — ${count} notification${count !== 1 ? 's' : ''}`,
        html,
      })
      emailsSent++
    } catch (err) {
      errors.push(`Failed to send to user ${user.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    status: 'ok',
    emailsSent,
    usersFound: byUser.size,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  })
}
