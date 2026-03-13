'use client'

import { useState, useTransition } from 'react'

interface EditPostFormProps {
  postId: string
  initialContent: string
  onSave: (newContent: string, editedAt: Date) => void
  onCancel: () => void
}

export function EditPostForm({ postId, initialContent, onSave, onCancel }: EditPostFormProps) {
  const [content, setContent] = useState(initialContent)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setError('Content cannot be empty.')
      return
    }
    if (content.length > 10000) {
      setError('Content must be at most 10,000 characters.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.status === 403) {
        const json = await res.json()
        if (json.error === 'edit_window_expired') {
          setError('The 15-minute edit window has expired.')
        } else {
          setError('You do not have permission to edit this post.')
        }
        return
      }
      if (!res.ok) {
        setError('Failed to save. Please try again.')
        return
      }
      const updated = await res.json()
      onSave(updated.content, new Date(updated.editedAt))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        maxLength={10000}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
