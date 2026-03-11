'use client'

import { useOptimistic, useTransition } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Avatar, Badge } from '@/ui/components'
import type { ForumPost } from '@/modules/forum/types'
import { formatRelativeTime } from '@/modules/forum/types'

interface PostCardProps {
  post: ForumPost
  currentUserId: string | null
  onVote: (postId: string, value: 1 | -1) => Promise<void>
}

export function PostCard({ post, currentUserId, onVote }: PostCardProps) {
  const [optimisticScore, setOptimisticScore] = useOptimistic(
    post.voteScore,
    (_current: number, delta: number) => _current + delta,
  )
  const [isPending, startTransition] = useTransition()

  const displayName = post.author.name || post.author.username || 'Anonymous'
  const avatarSrc = post.author.avatarUrl || post.author.image
  const canVote = !!currentUserId && currentUserId !== post.authorId

  function handleVote(value: 1 | -1) {
    if (!canVote) return
    startTransition(async () => {
      setOptimisticScore(value)
      await onVote(post.id, value)
    })
  }

  return (
    <article className="flex gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0">
      {/* Author column */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <Avatar
          src={avatarSrc}
          alt={displayName}
          size="md"
        />
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">
            {displayName}
          </span>
          {post.isFirst && <Badge variant="info">OP</Badge>}
          <time
            dateTime={new Date(post.createdAt).toISOString()}
            className="text-xs text-[var(--color-text-muted)]"
          >
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>

        {/* Body */}
        <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text)] leading-relaxed">
          {post.content}
        </div>

        {/* Vote bar */}
        <div className="mt-3 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleVote(1)}
            disabled={!canVote || isPending}
            aria-label="Upvote"
            className="inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-green-600 disabled:pointer-events-none disabled:opacity-40"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>

          <span className="min-w-[2rem] text-center text-sm font-medium text-[var(--color-text)]">
            {optimisticScore}
          </span>

          <button
            type="button"
            onClick={() => handleVote(-1)}
            disabled={!canVote || isPending}
            aria-label="Downvote"
            className="inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-red-500 disabled:pointer-events-none disabled:opacity-40"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
