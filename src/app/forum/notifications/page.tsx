import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, MessageSquare, CornerDownRight, AtSign, TrendingUp } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export const metadata: Metadata = { title: 'Notifications | Ride MTB Forum' }

const TYPE_CONFIG = {
  REPLY_TO_THREAD: { icon: MessageSquare, label: 'replied to your thread' },
  REPLY_TO_POST: { icon: CornerDownRight, label: 'replied to your post' },
  MENTION: { icon: AtSign, label: 'mentioned you' },
  VOTE_MILESTONE: { icon: TrendingUp, label: 'votes milestone reached' },
} as const

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const notifications = await db.forumNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      actor: { select: { name: true, username: true } },
      post: { select: { title: true, slug: true } },
    },
  })

  // Mark all as read when the page is viewed
  await db.forumNotification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
        <h1 className="text-xl font-bold text-[var(--color-text)]">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No notifications yet.</p>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.REPLY_TO_THREAD
            const Icon = config.icon
            const href = n.post
              ? `/forum/thread/${n.post.slug}${n.commentId ? `#${n.commentId}` : ''}`
              : '/forum'

            return (
              <Link
                key={n.id}
                href={href}
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-[var(--color-bg-secondary)] ${!n.read ? 'bg-[var(--color-primary)]/5' : ''}`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                  <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text)]">
                    {n.actor ? (
                      <span className="font-semibold">{n.actor.name ?? n.actor.username}</span>
                    ) : (
                      <span className="font-semibold">Your post</span>
                    )}{' '}
                    {config.label}
                    {n.post && (
                      <>
                        {' '}in{' '}
                        <span className="font-medium">{n.post.title}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
