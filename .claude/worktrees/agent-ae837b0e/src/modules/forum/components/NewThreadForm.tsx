'use client'

import { useActionState } from 'react'
import { Input, Button } from '@/ui/components'
import { createThread } from '../actions/createThread'

interface NewThreadFormProps {
  categoryId: string
  categorySlug: string
}

export function NewThreadForm({ categoryId, categorySlug }: NewThreadFormProps) {
  const [state, formAction, isPending] = useActionState(createThread, {
    errors: {} as Record<string, string>,
  })

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="categorySlug" value={categorySlug} />

      <Input
        label="Title"
        name="title"
        placeholder="Thread title"
        required
        maxLength={200}
        error={state.errors?.title}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="content"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Content
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={8}
          placeholder="Write your post..."
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
        <Button type="submit" loading={isPending}>
          Create Thread
        </Button>
      </div>
    </form>
  )
}
