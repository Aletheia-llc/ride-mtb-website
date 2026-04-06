import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { MarkAllReadButton } from './MarkAllReadButton'

export const metadata: Metadata = {
  title: 'Notifications | Ride MTB',
}

const PAGE_SIZE = 30

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await requireAuth()
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    db.notification.count({ where: { userId: user.id } }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ])

  // Mark fetched unread notifications as read
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
  if (unreadIds.length > 0) {
    await db.notification.updateMany({
      where: { id: { in: unreadIds } },
      data: { read: true },
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function getTypeIcon(type: string) {
    const icons: Record<string, string> = {
      forum_reply: '💬',
      forum_vote: '⬆️',
      forum_mention: '@',
      xp_milestone: '⭐',
      event_reminder: '📅',
      badge_awarded: '🏅',
      trail_condition: '🌤️',
      new_follower: '👤',
      system: '🔔',
    }
    return icons[type] ?? '🔔'
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount} new
            </span>
          )}
        </h1>
        {unreadCount > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-16 text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)]">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                !n.read
                  ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)]'
              }`}
            >
              <span className="mt-0.5 text-lg leading-none">{getTypeIcon(n.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text)]">{n.title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{n.message}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {new Date(n.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {n.linkUrl && (
                <Link
                  href={n.linkUrl}
                  className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  View →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/notifications?page=${page - 1}`}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/notifications?page=${page + 1}`}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
