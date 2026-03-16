'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { ThumbsUp, ThumbsDown, Pencil, Trash2 } from 'lucide-react'
import {
  MessageSquare, MessageCircle, MessagesSquare, Award,
  FilePlus, ThumbsUp as ThumbsUpIcon, TrendingUp as TrendingUpIcon, Calendar,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar, Badge } from '@/ui/components'
import { EditPostForm } from './EditPostForm'
import { ReplyForm } from './ReplyForm'
import type { ForumPost } from '@/modules/forum/types'
import { formatRelativeTime } from '@/modules/forum/types'

const BADGE_ICONS: Record<string, LucideIcon> = {
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  Award,
  FilePlus,
  ThumbsUp: ThumbsUpIcon,
  TrendingUp: TrendingUpIcon,
  Calendar,
}

interface PostCardProps {
  post: ForumPost
  currentUserId: string | null
  currentUserRole?: string | null
  onVote: (postId: string, value: 1 | -1) => Promise<void>
  showReplyButton?: boolean
  replyParentId?: string
  threadId?: string
  isLocked?: boolean
}

const EDIT_WINDOW_MS = 15 * 60 * 1000

export function PostCard({ post, currentUserId, currentUserRole, onVote, showReplyButton, replyParentId, threadId, isLocked }: PostCardProps) {
  const [optimisticScore, setOptimisticScore] = useOptimistic(
    post.voteScore,
    (_current: number, delta: number) => _current + delta,
  )
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [showInlineReply, setShowInlineReply] = useState(false)
  const [localContent, setLocalContent] = useState(post.content)
  const [localEditedAt, setLocalEditedAt] = useState<Date | null>(post.editedAt)
  const [deleted, setDeleted] = useState(!!post.deletedAt)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const displayName = post.author.name || post.author.username || 'Anonymous'
  const avatarSrc = post.author.avatarUrl || post.author.image
  const canVote = !!currentUserId && currentUserId !== post.authorId
  const isAdmin = currentUserRole === 'admin'
  const isAuthor = currentUserId === post.authorId
  const withinEditWindow = Date.now() - new Date(post.createdAt).getTime() < EDIT_WINDOW_MS
  const canEdit = (isAuthor && withinEditWindow) || isAdmin
  const canDelete = isAuthor || isAdmin

  function handleVote(value: 1 | -1) {
    if (!canVote) return
    startTransition(async () => {
      setOptimisticScore(value)
      await onVote(post.id, value)
    })
  }

  async function handleDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    const res = await fetch(`/api/forum/posts/${post.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleted(true)
    } else {
      setDeleteError('Failed to delete. Please try again.')
    }
  }

  if (deleted) {
    return (
      <article className="flex gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm italic text-[var(--color-text-muted)]">
            This post has been deleted.
          </p>
        </div>
      </article>
    )
  }

  return (
    <article className="flex gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0">
      {/* Author column */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <Avatar src={avatarSrc} alt={displayName} size="md" />
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">
            {displayName}
          </span>
          {post.isFirst && <Badge variant="info">OP</Badge>}
          {/* Forum badges (up to 3) */}
          {post.author.forumBadges?.slice(0, 3).map((ub) => {
            const Icon = BADGE_ICONS[ub.badge.icon] ?? Award
            return (
              <span
                key={ub.badgeSlug}
                title={`${ub.badge.name}: ${ub.badge.description}`}
                className="inline-flex items-center"
                style={{ color: ub.badge.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            )
          })}
          <time
            dateTime={new Date(post.createdAt).toISOString()}
            className="text-xs text-[var(--color-text-muted)]"
          >
            {formatRelativeTime(post.createdAt)}
          </time>
          {localEditedAt && (
            <span className="text-xs text-[var(--color-text-muted)]">(edited)</span>
          )}
        </div>

        {/* Body or edit form */}
        {isEditing ? (
          <EditPostForm
            postId={post.id}
            initialContent={localContent}
            onSave={(newContent, editedAt) => {
              setLocalContent(newContent)
              setLocalEditedAt(editedAt)
              setIsEditing(false)
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text)] leading-relaxed">
            {localContent}
          </div>
        )}

        {/* Action bar */}
        {!isEditing && (
          <div className="mt-3 flex items-center gap-1">
            {/* Vote buttons */}
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

            {/* Edit / Delete */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Edit post"
                className="ml-2 inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Delete post"
                className="inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {showReplyButton && !isEditing && (
              <button
                type="button"
                onClick={() => setShowInlineReply((prev) => !prev)}
                className="ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                <MessageSquare className="h-3 w-3" />
                Reply
              </button>
            )}
          </div>
        )}

        {showInlineReply && threadId && (
          <div className="mt-3">
            <ReplyForm
              threadId={threadId}
              isLocked={isLocked ?? false}
              parentId={replyParentId}
              onSuccess={() => setShowInlineReply(false)}
            />
          </div>
        )}

        {deleteError && (
          <p className="mt-1 text-xs text-red-500">{deleteError}</p>
        )}
      </div>
    </article>
  )
}
