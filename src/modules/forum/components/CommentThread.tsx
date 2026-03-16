'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CommentCard } from './CommentCard'
import { ReplyForm } from './ReplyForm'
import { ForumPagination } from './ForumPagination'
import type { ForumComment } from '@/modules/forum/types'

interface CommentThreadProps {
  postId: string
  comments: ForumComment[]
  total: number
  pageCount: number
  currentPage: number
  activeSort: 'oldest' | 'newest' | 'best'
  currentUserId?: string
  isLocked?: boolean
}

const SORT_OPTIONS = [
  { value: 'oldest' as const, label: 'Oldest' },
  { value: 'newest' as const, label: 'Newest' },
  { value: 'best'   as const, label: 'Best'   },
]

export function CommentThread({
  postId,
  comments,
  total,
  pageCount,
  currentPage,
  activeSort,
  currentUserId,
  isLocked,
}: CommentThreadProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', sort)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
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
          <ReplyForm threadId={postId} isLocked={false} />
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
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
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
