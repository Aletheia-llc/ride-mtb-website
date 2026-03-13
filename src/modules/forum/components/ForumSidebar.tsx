import Link from 'next/link'
import Image from 'next/image'
import { Plus, Hash, BarChart2, Users, TrendingUp, Clock, ExternalLink, Search } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import {
  getCategories,
  getForumStats,
  getTopForumMembers,
  getPopularTags,
  getLatestForumThreads,
} from '@/modules/forum/lib/queries'
// eslint-disable-next-line no-restricted-imports
import { formatRelativeTime } from '@/modules/forum/types'
import { AdSlot } from '@/ui/components'

export async function ForumSidebar({ currentCategorySlug }: { currentCategorySlug?: string }) {
  const [categories, stats, topMembers, popularTags, latestThreads] = await Promise.all([
    getCategories(),
    getForumStats(),
    getTopForumMembers(5),
    getPopularTags(10),
    getLatestForumThreads(5),
  ])

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-4">
      {/* Search */}
      <form method="GET" action="/forum/search" className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
        <input
          name="q"
          type="search"
          placeholder="Search forum..."
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none"
        />
      </form>

      {/* Create thread */}
      <Link
        href="/forum/new"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
      >
        <Plus className="h-4 w-4" />
        Create Thread
      </Link>

      {/* Categories */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Browse</p>
        <div className="space-y-1">
          <Link
            href="/forum"
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${!currentCategorySlug ? 'bg-[var(--color-bg-secondary)] font-medium text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'}`}
          >
            <Hash className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            All Posts
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/forum/${cat.slug}`}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${currentCategorySlug === cat.slug ? 'bg-[var(--color-bg-secondary)] font-medium text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'}`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: (cat as { color?: string }).color ?? '#6b7280' }}
              />
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Forum stats */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <BarChart2 className="h-3.5 w-3.5" />
          Forum Stats
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Posts', value: stats.threadCount },
            { label: 'Comments', value: stats.postCount },
            { label: 'Members', value: stats.userCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-[var(--color-bg-secondary)] p-2 text-center">
              <p className="text-base font-bold text-[var(--color-text)]">{value.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ad */}
      <div className="flex justify-center">
        <AdSlot size="rectangle" />
      </div>

      {/* Latest posts */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <Clock className="h-3.5 w-3.5" />
          Latest Posts
        </p>
        <div className="space-y-2">
          {latestThreads.map((thread) => {
            const author = thread.posts[0]?.author
            return (
              <div key={thread.id}>
                <Link
                  href={`/forum/thread/${thread.slug}`}
                  className="line-clamp-1 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {thread.title}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {author?.name ?? author?.username ?? 'Anonymous'} · {formatRelativeTime(thread.createdAt)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top members */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <Users className="h-3.5 w-3.5" />
          Top Members
        </p>
        <div className="space-y-2">
          {topMembers.map(({ rank, user, postCount }) => {
            const displayName = user.name || user.username || 'Anonymous'
            const avatarSrc = user.avatarUrl || user.image
            return (
              <div key={user.id} className="flex items-center gap-2">
                <span className="w-4 text-center text-xs font-bold text-[var(--color-text-muted)]">{rank}</span>
                {avatarSrc ? (
                  <Image src={avatarSrc} alt={displayName} width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[10px] font-medium text-[var(--color-text-muted)]">
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {user.username ? (
                  <Link href={`/forum/user/${user.username}`} className="flex-1 truncate text-sm text-[var(--color-text)] hover:text-[var(--color-primary)]">
                    {displayName}
                  </Link>
                ) : (
                  <span className="flex-1 truncate text-sm text-[var(--color-text)]">{displayName}</span>
                )}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {postCount}{(user.karma ?? 0) > 0 ? ` · ${user.karma}pt` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Popular tags */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <TrendingUp className="h-3.5 w-3.5" />
          Popular Tags
        </p>
        <div className="flex flex-wrap gap-1.5">
          {popularTags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/forum?tag=${tag.slug}`}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: `${tag.color}38`, color: tag.color, border: `1px solid ${tag.color}60` }}
            >
              {tag.name}
              <span className="rounded-full bg-white/20 px-1 text-[10px]">{tag._count.threads}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Quick Links</p>
        <div className="space-y-1">
          {[
            { label: 'Forum Home', href: '/forum' },
            { label: 'Communities', href: '/forum/communities' },
            { label: 'Leaderboard', href: '/learn/leaderboard' },
            { label: 'Trail Maps', href: '/trails' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
            >
              {label}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
