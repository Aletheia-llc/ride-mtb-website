'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CommentCard } from './CommentCard'
import { ForumPagination } from './ForumPagination'
// eslint-disable-next-line no-restricted-imports
import { ReplyForm } from '@/modules/forum/components/ReplyForm'
import type { ForumComment } from '@/modules/forum/types'

function buildCommentTree(comments: ForumComment[]): ForumComment[] {
  const map = new Map<string, ForumComment & { replies: ForumComment[] }>()
  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] })
  }
  const roots: ForumComment[] = []
  for (const c of comments) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

interface CommentThreadProps {
  comments: ForumComment[]
  total: number
  pageCount: number
  currentPage: number
  activeSort: 'oldest' | 'newest' | 'best'
  currentUserId?: string
  isLocked: boolean
  threadId: string
}

const SORT_OPTIONS = [
  { value: 'oldest' as const, label: 'Oldest' },
  { value: 'newest' as const, label: 'Newest' },
  { value: 'best'   as const, label: 'Best'   },
]

export function CommentThread({
  comments,
  total,
  pageCount,
  currentPage,
  activeSort,
  currentUserId,
  isLocked,
  threadId,
}: CommentThreadProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const setSort = (sort: string) => {
    startTransition(() => router.push(`${pathname}?sort=${sort}`))
  }

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <h2 className="text-lg font-semibold">
          {total} {total === 1 ? 'comment' : 'comments'}
        </h2>
        <div className="flex gap-1 rounded-md border border-[var(--color-border)] p-0.5">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              className={[
                'rounded px-3 py-1 text-sm transition-colors',
                activeSort === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reply form or locked notice */}
      {isLocked ? (
        <p className="mb-6 rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
          This thread is locked.
        </p>
      ) : currentUserId ? (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ReplyForm threadId={threadId} isLocked={false} />
        </div>
      ) : (
        <p className="mb-6 rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
          <a href="/signin" className="font-medium text-[var(--color-primary)] hover:underline">Sign in</a> to leave a reply.
        </p>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          No comments yet. Be the first to reply!
        </p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {buildCommentTree(comments).map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              depth={0}
              threadId={threadId}
              isLocked={isLocked}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <ForumPagination currentPage={currentPage} pageCount={pageCount} />
      )}
    </section>
  )
}
