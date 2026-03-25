import Image from 'next/image'
import Link from 'next/link'
import { TrendingUp, MessageSquare, Trophy } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { getForumLeaderboard } from '@/modules/forum/lib/queries'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard | Ride MTB Forum',
  description: 'Top contributors on the Ride MTB Forum ranked by karma.',
}

export default async function ForumLeaderboardPage() {
  const leaders = await getForumLeaderboard(50)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Forum Leaderboard</h1>
      </div>

      {leaders.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          No members yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
          {leaders.map((leader, index) => {
            const displayName = leader.name || leader.username || 'Anonymous'
            const avatarSrc = leader.avatarUrl || leader.image
            const profileHref = leader.username ? `/forum/user/${leader.username}` : null

            const rankColor =
              index === 0 ? 'text-yellow-500' :
              index === 1 ? 'text-slate-400' :
              index === 2 ? 'text-amber-600' :
              'text-[var(--color-text-muted)]'

            return (
              <div
                key={leader.id}
                className="flex items-center gap-4 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
              >
                {/* Rank */}
                <span className={`w-8 shrink-0 text-center text-sm font-bold ${rankColor}`}>
                  {leader.rank}
                </span>

                {/* Avatar */}
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-bold text-[var(--color-text-muted)]">
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                {/* Name + username */}
                <div className="min-w-0 flex-1">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="truncate font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span className="truncate font-semibold text-[var(--color-text)]">
                      {displayName}
                    </span>
                  )}
                  {leader.username && (
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      @{leader.username}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex shrink-0 items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {leader.postCount}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-[var(--color-text)]">
                    <TrendingUp className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    {leader.karma}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
