'use client'

import { useActionState, useRef } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/ui/components'
import { createPost } from '../actions/createPost'

interface ReplyFormProps {
  threadId: string
  isLocked: boolean
}

export function ReplyForm({ threadId, isLocked }: ReplyFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (prevState: { errors: Record<string, string>; success?: boolean }, formData: FormData) => {
      const result = await createPost(prevState, formData)
      if (result.success) {
        formRef.current?.reset()
      }
      return result
    },
    { errors: {} as Record<string, string> },
  )

  if (isLocked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <Lock className="h-4 w-4" />
        This thread is locked. No new replies can be posted.
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="reply-content"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Reply
        </label>
        <textarea
          id="reply-content"
          name="content"
          required
          rows={4}
          placeholder="Write your reply..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {state.errors?.content && (
          <p className="text-xs text-red-500">{state.errors.content}</p>
        )}
      </div>

      {state.errors?.general && (
        <p className="text-sm text-red-500">{state.errors.general}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={isPending}>
          Post Reply
        </Button>
      </div>
    </form>
  )
}
