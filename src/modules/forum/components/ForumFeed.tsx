import Link from 'next/link'
import { Pin, Lock, MessageSquare, Eye, ThumbsUp } from 'lucide-react'
import { Avatar, EmptyState } from '@/ui/components'
import type { PostSummary } from '@/modules/forum/types'
import { formatRelativeTime } from '@/modules/forum/types'

interface ForumFeedProps {
  posts: PostSummary[]
  categorySlug: string
}

export function ForumFeed({ posts, categorySlug }: ForumFeedProps) {
  if (posts.length === 0) {
    return (
      <EmptyState
        title="No threads yet"
        description="Be the first to start a discussion in this category."
        icon={<MessageSquare className="h-10 w-10" />}
        action={
          <Link
            href={`/forum/${categorySlug}/new`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            Start a thread
          </Link>
        }
      />
    )
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {posts.map((post) => {
        const author = post.author
        const displayName = author?.name || author?.username || 'Anonymous'
        const replyCount = post._count.comments

        return (
          <article
            key={post.id}
            className={`flex items-center gap-4 px-2 py-3 transition-colors hover:bg-[var(--color-bg-secondary)] ${
              post.isPinned ? 'bg-[var(--color-bg-secondary)]/50' : ''
            }`}
          >
            {/* Author avatar */}
            {author && (
              <div className="hidden sm:block">
                <Avatar
                  src={author.image}
                  alt={displayName}
                  size="sm"
                />
              </div>
            )}

            {/* Title + meta */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {post.isPinned && (
                  <Pin className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-primary)]" aria-label="Pinned" />
                )}
                {post.isLocked && (
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" aria-label="Locked" />
                )}
                <Link
                  href={`/forum/thread/${post.slug}`}
                  className="truncate text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {post.title}
                </Link>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <span>{displayName}</span>
                <span>&middot;</span>
                <time dateTime={new Date(post.createdAt).toISOString()}>
                  {formatRelativeTime(post.createdAt)}
                </time>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden items-center gap-4 text-xs text-[var(--color-text-muted)] sm:flex">
              <span className="flex items-center gap-1" title="Replies">
                <MessageSquare className="h-3.5 w-3.5" />
                {replyCount}
              </span>
              <span className="flex items-center gap-1" title="Votes">
                <ThumbsUp className="h-3.5 w-3.5" />
                {post.voteScore}
              </span>
              <span className="flex items-center gap-1" title="Views">
                <Eye className="h-3.5 w-3.5" />
                {post.viewCount}
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
