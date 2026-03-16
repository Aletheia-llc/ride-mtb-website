'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { formatRelativeTime } from '@/modules/forum/types'
// eslint-disable-next-line no-restricted-imports
import { votePost } from '@/modules/forum/actions/votePost'
import type { ForumComment } from '@/modules/forum/types'

interface CommentCardProps {
  comment: ForumComment
  currentUserId?: string
}

export function CommentCard({ comment, currentUserId }: CommentCardProps) {
  const [voteScore, setVoteScore] = useState(comment.voteScore)
  const [voting, setVoting] = useState(false)

  const author = comment.author
  const joinedYear = author.createdAt ? new Date(author.createdAt).getFullYear() : null
  const postCount = author._count?.posts ?? 0

  const handleVote = async (value: 1 | -1) => {
    if (!currentUserId || voting) return
    setVoting(true)
    const result = await votePost(comment.id, value, 'comment')
    if (result && 'voteScore' in result && result.voteScore !== undefined) setVoteScore(result.voteScore)
    setVoting(false)
  }

  if (comment.deletedAt) {
    return (
      <div className="py-4">
        <p className="text-sm italic text-[var(--color-text-muted)]">[deleted]</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 py-4">
      {/* Author avatar */}
      <Link href={`/forum/user/${author.username}`} className="shrink-0">
        {author.avatarUrl || author.image ? (
          <Image
            src={author.avatarUrl ?? author.image ?? ''}
            alt={author.name ?? 'Author'}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-bold text-[var(--color-primary)]">
            {(author.name ?? author.username ?? '?')[0].toUpperCase()}
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        {/* Author meta */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link
            href={`/forum/user/${author.username}`}
            className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            {author.name ?? author.username}
          </Link>
          {author.role && author.role !== 'user' && (
            <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 font-medium text-[var(--color-primary)] capitalize">
              {author.role}
            </span>
          )}
          {joinedYear && <span>Joined {joinedYear}</span>}
          <span>{postCount} posts</span>
          {author.karma !== null && author.karma !== undefined && (
            <span>{author.karma} karma</span>
          )}
          <span className="ml-auto">{formatRelativeTime(comment.createdAt)}</span>
        </div>

        {/* Body */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote(1)}
              disabled={!currentUserId || voting}
              className="rounded p-0.5 hover:bg-[var(--color-primary)]/10 disabled:opacity-40"
              aria-label="Upvote"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold">{voteScore}</span>
            <button
              onClick={() => handleVote(-1)}
              disabled={!currentUserId || voting}
              className="rounded p-0.5 hover:bg-red-500/10 disabled:opacity-40"
              aria-label="Downvote"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {comment.editedAt && (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              edited {formatRelativeTime(comment.editedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
