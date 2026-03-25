'use client'

import { useActionState } from 'react'
import { publishVideo } from '../actions/publishVideo'

type Tag = { id: string; value: string; source: string; confirmed: boolean }
type PublishState = { errors: Record<string, string>; success?: boolean }

export function TagConfirmationForm({ videoId, tags }: { videoId: string; tags: Tag[] }) {
  const [state, formAction, pending] = useActionState<PublishState, FormData>(
    async (_prev: PublishState, _fd: FormData) => publishVideo({ videoId }),
    { errors: {} },
  )

  if (state.success) {
    return <p className="text-sm font-medium text-green-600">Video is now live! 🎉</p>
  }

  return (
    <form action={formAction}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        AI-suggested tags — review and publish
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-xs text-[var(--color-text)]"
          >
            {tag.value}
            {tag.source === 'ai' && (
              <span className="ml-1 text-[var(--color-text-muted)]">·AI</span>
            )}
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">No tags suggested yet.</span>
        )}
      </div>
      {state.errors.general && (
        <p className="mb-2 text-xs text-red-500">{state.errors.general}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Publishing…' : 'Confirm Tags & Publish'}
      </button>
    </form>
  )
}
