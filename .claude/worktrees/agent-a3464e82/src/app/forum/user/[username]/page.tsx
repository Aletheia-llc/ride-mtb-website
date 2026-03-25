import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  MessageSquare, TrendingUp, Calendar, Mail,
  Award, FilePlus, ThumbsUp, TrendingUp as TrendingUpIcon2,
  MessageCircle, MessagesSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getForumUserProfile, getUserForumThreads, getUserForumBookmarks } from '@/modules/forum/lib/queries'
// eslint-disable-next-line no-restricted-imports
import { ForumThreadCard } from '@/modules/forum/components/ForumThreadCard'

import type { Metadata } from 'next'

const BADGE_ICONS: Record<string, LucideIcon> = {
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  Award,
  FilePlus,
  ThumbsUp,
  TrendingUp: TrendingUpIcon2,
  Calendar,
}

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const user = await getForumUserProfile(username)

  if (!user) {
    return { title: 'User Not Found | Ride MTB Forum' }
  }

  const displayName = user.name || user.username || 'Rider'
  return {
    title: `${displayName} | Ride MTB Forum`,
    description: user.bio || `${displayName}'s forum profile on Ride MTB`,
  }
}

export default async function ForumUserProfilePage({ params }: PageProps) {
  const { username } = await params
  const [user, session] = await Promise.all([
    getForumUserProfile(username),
    auth(),
  ])

  if (!user) notFound()

  const currentUserId = session?.user?.id ?? null
  const [threads, bookmarkedIds] = await Promise.all([
    getUserForumThreads(user.id),
    currentUserId ? getUserForumBookmarks(currentUserId) : Promise.resolve(new Set<string>()),
  ])

  const displayName = user.name || user.username || 'Anonymous'
  const avatarSrc = user.avatarUrl || user.image
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile header */}
      <div className="mb-8 flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={displayName}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-2xl font-bold text-[var(--color-text-muted)]">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--color-text)]">{displayName}</h1>
            {user.username && (
              <span className="text-sm text-[var(--color-text-muted)]">@{user.username}</span>
            )}
            {(user.role === 'admin' || user.role === 'instructor') && (
              <span className="rounded bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                {user.role === 'admin' ? 'Admin' : 'Instructor'}
              </span>
            )}
          </div>
          {user.bio && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{user.bio}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {user.karma ?? 0} karma
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {user._count.forumPosts} posts
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {joinDate}
            </span>
          </div>
          {currentUserId && currentUserId !== user.id && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/messages?to=${user.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                <Mail className="h-3.5 w-3.5" />
                Message
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      {user.forumBadges && user.forumBadges.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-[var(--color-text)]">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {user.forumBadges.map((ub) => {
              const Icon = BADGE_ICONS[ub.badge.icon] ?? Award
              return (
                <div
                  key={ub.badgeSlug}
                  className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
                  title={ub.badge.description}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: ub.badge.color }} />
                  <span className="text-sm font-medium text-[var(--color-text)]">{ub.badge.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Threads */}
      <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">
        Threads by {displayName}
      </h2>
      {threads.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          No threads posted yet.
        </p>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ForumThreadCard
              key={thread.id}
              thread={thread}
              currentUserId={currentUserId}
              initialBookmarked={bookmarkedIds.has(thread.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
