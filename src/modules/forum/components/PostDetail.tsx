'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronUp, ChevronDown, Bookmark, Flag, Share2 } from 'lucide-react'
import { formatRelativeTime } from '@/modules/forum/types'
// eslint-disable-next-line no-restricted-imports
import { votePost } from '@/modules/forum/actions/votePost'
// eslint-disable-next-line no-restricted-imports
import { toggleForumBookmark } from '@/modules/forum/actions/bookmarkThread'
// eslint-disable-next-line no-restricted-imports
import { LinkPreviewCard } from '@/modules/forum/components/LinkPreviewCard'
import type { PostDetail as PostDetailType } from '@/modules/forum/types'

interface PostDetailProps {
  post: PostDetailType
  currentUserId?: string
  isBookmarked?: boolean
}

export function PostDetail({ post, currentUserId, isBookmarked: initialBookmarked = false }: PostDetailProps) {
  const [voteScore, setVoteScore] = useState(post.voteScore)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [voting, setVoting] = useState(false)

  const author = post.author
  const joinedYear = author.createdAt ? new Date(author.createdAt).getFullYear() : null
  const postCount = author._count?.posts ?? 0

  const handleVote = async (value: 1 | -1) => {
    if (!currentUserId || voting) return
    setVoting(true)
    const result = await votePost(post.id, value, 'post')
    if (result && 'voteScore' in result && result.voteScore !== undefined) setVoteScore(result.voteScore)
    setVoting(false)
  }

  const handleBookmark = async () => {
    if (!currentUserId) return
    const result = await toggleForumBookmark(post.id)
    if (result && 'bookmarked' in result && result.bookmarked !== undefined) setBookmarked(result.bookmarked)
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>

      {/* Author block */}
      <div className="mb-6 flex items-start gap-4 border-b border-[var(--color-border)] pb-4">
        <Link href={`/forum/user/${author.username}`}>
          {author.avatarUrl || author.image ? (
            <Image
              src={author.avatarUrl ?? author.image ?? ''}
              alt={author.name ?? 'Author'}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-lg font-bold text-[var(--color-primary)]">
              {(author.name ?? author.username ?? '?')[0].toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/forum/user/${author.username}`}
              className="font-semibold hover:text-[var(--color-primary)]"
            >
              {author.name ?? author.username}
            </Link>
            {author.role && author.role !== 'user' && (
              <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-primary)] capitalize">
                {author.role}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
            {joinedYear && <span>Joined {joinedYear}</span>}
            <span>{postCount} posts</span>
            {author.karma !== undefined && author.karma !== null && (
              <span>{author.karma} karma</span>
            )}
          </div>
          {author.userBadges && author.userBadges.length > 0 && (
            <div className="mt-1 flex gap-1">
              {author.userBadges.slice(0, 3).map((ub, i) => (
                <span key={i} title={ub.badge.name} className="text-base">
                  {ub.badge.icon}
                </span>
              ))}
            </div>
          )}
        </div>
        <time dateTime={post.createdAt.toISOString()} className="text-xs text-[var(--color-text-muted)]">
          {formatRelativeTime(post.createdAt)}
        </time>
      </div>

      {/* Body */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>

      {/* Link preview */}
      {post.linkPreview && (
        <LinkPreviewCard
          url={post.linkPreview.url}
          title={post.linkPreview.title}
          description={post.linkPreview.description}
          imageUrl={post.linkPreview.imageUrl}
        />
      )}

      {/* Action bar */}
      <div className="mt-6 flex items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote(1)}
            disabled={!currentUserId || voting}
            className="rounded p-1 hover:bg-[var(--color-primary)]/10 disabled:opacity-40"
            aria-label="Upvote"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className="min-w-[2ch] text-center text-sm font-semibold">{voteScore}</span>
          <button
            onClick={() => handleVote(-1)}
            disabled={!currentUserId || voting}
            className="rounded p-1 hover:bg-red-500/10 disabled:opacity-40"
            aria-label="Downvote"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {currentUserId && (
          <button
            onClick={handleBookmark}
            className={[
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
              bookmarked
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
            {bookmarked ? 'Saved' : 'Save'}
          </button>
        )}

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>

        {currentUserId && currentUserId !== post.author.id && (
          <button className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-red-500">
            <Flag className="h-4 w-4" />
            Report
          </button>
        )}
      </div>
    </article>
  )
}
