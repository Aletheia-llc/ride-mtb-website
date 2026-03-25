'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronUp, ChevronDown, Bookmark, Share2, Pencil, Trash2 } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { TipButton } from '@/modules/forum/components/TipButton'
import { formatRelativeTime } from '@/modules/forum/types'
// eslint-disable-next-line no-restricted-imports
import { votePost } from '@/modules/forum/actions/votePost'
// eslint-disable-next-line no-restricted-imports
import { toggleForumBookmark } from '@/modules/forum/actions/bookmarkThread'
// eslint-disable-next-line no-restricted-imports
import { LinkPreviewCard } from '@/modules/forum/components/LinkPreviewCard'
// eslint-disable-next-line no-restricted-imports
import { ReportButton } from '@/modules/forum/components/ReportButton'
import type { PostDetail as PostDetailType } from '@/modules/forum/types'

interface PostDetailProps {
  post: PostDetailType
  currentUserId?: string
  isBookmarked?: boolean
}

export function PostDetail({ post, currentUserId, isBookmarked: initialBookmarked = false }: PostDetailProps) {
  const router = useRouter()
  const [voteScore, setVoteScore] = useState(post.voteScore)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [voting, setVoting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(post.body)
  const [currentBody, setCurrentBody] = useState(post.body)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAuthor = currentUserId === post.author.id

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

  const handleEditSave = async () => {
    if (!editBody.trim()) return
    setEditSaving(true)
    setEditError(null)
    const res = await fetch(`/api/forum/threads/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: editBody.trim() }),
    })
    setEditSaving(false)
    if (res.status === 403) {
      const json = await res.json()
      setEditError(json.error === 'edit_window_expired' ? 'The 15-minute edit window has expired.' : 'Permission denied.')
      return
    }
    if (!res.ok) {
      setEditError('Failed to save. Please try again.')
      return
    }
    setCurrentBody(editBody.trim())
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this thread? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/forum/threads/${post.id}`, { method: 'DELETE' })
    if (res.ok) {
      const { categorySlug } = await res.json()
      router.push(`/forum/category/${categorySlug}`)
    } else {
      setDeleting(false)
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
      {editing ? (
        <div className="mb-4 flex flex-col gap-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={6}
            maxLength={10000}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
          />
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setEditBody(currentBody); setEditError(null) }}
              disabled={editSaving}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentBody}</ReactMarkdown>
        </div>
      )}

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

        <div className="rounded-md px-3 py-1.5">
          <TipButton
            postId={post.id}
            currentUserId={currentUserId}
            isOwnContent={isAuthor}
          />
        </div>

        {isAuthor && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => { setEditing(true); setEditBody(currentBody) }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
        {currentUserId && !isAuthor && (
          <div className="ml-auto">
            <ReportButton targetType="post" targetId={post.id} />
          </div>
        )}
      </div>
    </article>
  )
}
