'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Trash2, Ban, XCircle } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import {
  resolveForumReport,
  dismissForumReport,
  deleteReportedPost,
  deleteReportedThread,
  banReportedUser,
} from '@/modules/forum/actions/moderateReport'

interface ModReportActionsProps {
  reportId: string
  targetType: 'POST' | 'THREAD' | 'USER'
  postId?: string | null
  threadId?: string | null
  authorId?: string | null
}

export function ModReportActions({ reportId, targetType, postId, threadId, authorId }: ModReportActionsProps) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) {
    return <span className="text-xs text-[var(--color-text-muted)]">Action taken</span>
  }

  function handle(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      setDone(true)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handle(() => resolveForumReport(reportId))}
        disabled={isPending}
        className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Resolve
      </button>

      <button
        onClick={() => handle(() => dismissForumReport(reportId))}
        disabled={isPending}
        className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" />
        Dismiss
      </button>

      {targetType === 'POST' && postId && (
        <button
          onClick={() => handle(() => deleteReportedPost(reportId, postId))}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Post
        </button>
      )}

      {targetType === 'THREAD' && threadId && (
        <button
          onClick={() => handle(() => deleteReportedThread(reportId, threadId))}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Thread
        </button>
      )}

      {authorId && (
        <button
          onClick={() => handle(() => banReportedUser(reportId, authorId))}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <Ban className="h-3.5 w-3.5" />
          Ban User
        </button>
      )}
    </div>
  )
}
