'use client'

import { useState, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, Eye, Bookmark, Pin, Lock, ChevronUp, ChevronDown } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { formatRelativeTime } from '@/modules/forum/types'
// eslint-disable-next-line no-restricted-imports
import { votePost } from '@/modules/forum/actions/votePost'
// eslint-disable-next-line no-restricted-imports
import { toggleForumBookmark } from '@/modules/forum/actions/bookmarkThread'
// eslint-disable-next-line no-restricted-imports
import { ReportButton } from '@/modules/forum/components/ReportButton'

interface ThreadCardTag {
  tag: { name: string; slug: string; color: string }
}

interface ThreadCardAuthor {
  id: string
  name: string | null
  username: string | null
  image: string | null
  avatarUrl?: string | null
  role: string
}

interface ForumThreadCardProps {
  thread: {
    id: string
    title: string
    slug: string
    isPinned: boolean
    isLocked: boolean
    viewCount: number
    createdAt: Date
    voteScore: number
    replyCount: number
    category: { name: string; slug: string; color: string }
    tags: ThreadCardTag[]
    posts: Array<{
      id: string
      content: string
      author: ThreadCardAuthor
    }>
  }
  currentUserId: string | null
  initialBookmarked?: boolean
}

export function ForumThreadCard({ thread, currentUserId, initialBookmarked = false }: ForumThreadCardProps) {
  const firstPost = thread.posts[0]
  const author = firstPost?.author
  const displayName = author?.name || author?.username || 'Anonymous'
  const avatarSrc = author?.avatarUrl || author?.image
  const preview = firstPost?.content.slice(0, 200) ?? ''
  const canVote = !!currentUserId && !!firstPost && currentUserId !== firstPost.author.id

  const [optimisticScore, setOptimisticScore] = useOptimistic(
    thread.voteScore,
    (_cur: number, delta: number) => _cur + delta,
  )
  const [isPending, startTransition] = useTransition()
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked)

  function handleVote(value: 1 | -1) {
    if (!canVote || !firstPost) return
    startTransition(async () => {
      setOptimisticScore(value)
      await votePost(firstPost.id, value)
    })
  }

  async function handleBookmark() {
    if (!currentUserId) return
    const result = await toggleForumBookmark(thread.id)
    setIsBookmarked(result.bookmarked)
  }

  return (
    <article className={`flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[var(--color-text-muted)] hover:shadow-sm ${thread.isPinned ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5' : ''}`}>
      {/* Vote column */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <button
          type="button"
          onClick={() => handleVote(1)}
          disabled={!canVote || isPending}
          aria-label="Upvote"
          className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-amber-500/10 hover:text-amber-500 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <span className={`text-sm font-bold tabular-nums ${optimisticScore > 0 ? 'text-amber-500' : optimisticScore < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
          {optimisticScore}
        </span>
        <button
          type="button"
          onClick={() => handleVote(-1)}
          disabled={!canVote || isPending}
          aria-label="Downvote"
          className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-purple-500/10 hover:text-purple-500 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Meta row */}
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {/* Category badge */}
          <Link
            href={`/forum/${thread.category.slug}`}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: thread.category.color }}
          >
            {thread.category.name}
          </Link>
          {/* Author */}
          {author && (
            <>
              <span className="text-[var(--color-text-muted)]">·</span>
              <div className="flex items-center gap-1">
                {avatarSrc ? (
                  <Image src={avatarSrc} alt={displayName} width={16} height={16} className="h-4 w-4 rounded-full object-cover" />
                ) : (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[9px] font-medium text-[var(--color-text-muted)]">
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {author.username ? (
                  <Link href={`/forum/user/${author.username}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
                    {displayName}
                  </Link>
                ) : (
                  <span className="font-medium text-[var(--color-text)]">{displayName}</span>
                )}
                {(author.role === 'admin' || author.role === 'instructor') && (
                  <span className="rounded bg-[var(--color-primary)]/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    {author.role === 'admin' ? 'Admin' : 'Instructor'}
                  </span>
                )}
              </div>
              <span className="text-[var(--color-text-muted)]">·</span>
              <time className="text-[var(--color-text-muted)]">{formatRelativeTime(thread.createdAt)}</time>
            </>
          )}
          {thread.isPinned && (
            <>
              <span className="text-[var(--color-text-muted)]">·</span>
              <span className="flex items-center gap-0.5 text-[var(--color-primary)]">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            </>
          )}
          {thread.isLocked && (
            <>
              <span className="text-[var(--color-text-muted)]">·</span>
              <span className="flex items-center gap-0.5 text-yellow-500">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <Link
          href={`/forum/thread/${thread.slug}`}
          className="mb-1 block text-base font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          {thread.title}
        </Link>

        {/* Body preview */}
        {preview && (
          <p className="mb-2 line-clamp-2 text-sm text-[var(--color-text-muted)]">
            {preview}
            {firstPost && firstPost.content.length > 200 && '…'}
          </p>
        )}

        {/* Tags */}
        {thread.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {thread.tags.map(({ tag }) => (
              <Link
                key={tag.slug}
                href={`/forum?tag=${tag.slug}`}
                className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: `${tag.color}38`, color: tag.color, border: `1px solid ${tag.color}60` }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <Link
            href={`/forum/thread/${thread.slug}`}
            className="flex items-center gap-1 hover:text-[var(--color-text)]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </Link>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {thread.viewCount.toLocaleString()}
          </span>
          {currentUserId && (
            <button
              type="button"
              onClick={handleBookmark}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              className={`flex items-center gap-1 transition-colors hover:text-[var(--color-text)] ${isBookmarked ? 'text-[var(--color-primary)]' : ''}`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
          )}
          {currentUserId && firstPost && (
            <ReportButton targetType="thread" targetId={thread.id} />
          )}
        </div>
      </div>
    </article>
  )
}
