import Link from 'next/link'
// eslint-disable-next-line no-restricted-imports
import { getCategories, getForumStats, getOnlineUserCount } from '@/modules/forum/lib/queries'
import { Users } from 'lucide-react'

interface Props {
  activeSlug?: string
}

export async function ForumSidebarNav({ activeSlug }: Props) {
  const [categories, stats, onlineCount] = await Promise.all([
    getCategories(),
    getForumStats(),
    getOnlineUserCount(),
  ])

  return (
    <aside className="w-60 shrink-0 space-y-6">
      {/* Browse */}
      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Browse
        </p>
        <nav className="space-y-0.5">
          <Link
            href="/forum"
            className={[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              !activeSlug
                ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            All Posts
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/forum/${cat.slug}`}
              className={[
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                activeSlug === cat.slug
                  ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </Link>
          ))}
        </nav>
        <Link
          href="/forum/communities"
          className="mt-1 flex items-center gap-2 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <Users className="h-4 w-4" />
          Discover Communities
        </Link>
      </div>

      {/* Forum Stats */}
      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Forum Stats
        </p>
        <div className="space-y-1 px-2 text-sm text-[var(--color-text-muted)]">
          <div>{stats.threadCount.toLocaleString()} posts</div>
          <div>{stats.postCount.toLocaleString()} comments</div>
          <div>{stats.userCount.toLocaleString()} members</div>
        </div>
      </div>

      {/* Who's Online */}
      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Who&apos;s Online
        </p>
        <div className="flex items-center gap-2 px-2 text-sm text-[var(--color-text-muted)]">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
        </div>
      </div>
    </aside>
  )
}
