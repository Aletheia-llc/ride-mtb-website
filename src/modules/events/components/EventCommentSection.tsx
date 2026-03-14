'use client'
import { useState } from 'react'
import { useActionState } from 'react'
import { createEventComment } from '../actions/createEventComment'

type Comment = {
  id: string
  body: string
  createdAt: Date
  user: { name: string | null }
  replies: Array<{ id: string; body: string; createdAt: Date; user: { name: string | null } }>
}

type CommentState = { errors: Record<string, string>; success?: boolean }

function CommentForm({ eventId, parentId, onSuccess }: { eventId: string; parentId?: string; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(
    createEventComment as (s: CommentState, f: FormData) => Promise<CommentState>,
    { errors: {} },
  )

  if (state.success && onSuccess) onSuccess()

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea name="body" placeholder={parentId ? 'Write a reply…' : 'Join the conversation…'} required maxLength={2000}
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] h-20 resize-none" />
      {state.errors.general && <p className="text-xs text-red-500">{state.errors.general}</p>}
      <button type="submit" disabled={pending}
        className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {pending ? 'Posting…' : parentId ? 'Reply' : 'Post Comment'}
      </button>
    </form>
  )
}

export function EventCommentSection({ eventId, comments }: { eventId: string; comments: Comment[] }) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">Comments ({comments.length})</h2>
      <CommentForm eventId={eventId} />
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="space-y-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text)]">{comment.user.name ?? 'Anonymous'}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-[var(--color-text)]">{comment.body}</p>
              <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                Reply
              </button>
            </div>
            {comment.replies.map(reply => (
              <div key={reply.id} className="ml-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--color-text)]">{reply.user.name ?? 'Anonymous'}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(reply.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-[var(--color-text)]">{reply.body}</p>
              </div>
            ))}
            {replyingTo === comment.id && (
              <div className="ml-8">
                <CommentForm eventId={eventId} parentId={comment.id} onSuccess={() => setReplyingTo(null)} />
              </div>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No comments yet. Start the conversation!</p>}
      </div>
    </div>
  )
}
