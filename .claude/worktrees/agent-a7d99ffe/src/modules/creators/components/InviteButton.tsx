'use client'

import { useActionState } from 'react'
import { generateInvite, type GenerateInviteState } from '../actions/generateInvite'

export function InviteButton() {
  const [state, action, isPending] = useActionState<GenerateInviteState, FormData>(
    generateInvite,
    { errors: {} },
  )

  return (
    <div className="space-y-3">
      <form action={action}>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {isPending ? 'Generating...' : 'Generate Invite Link'}
        </button>
      </form>

      {state.errors.general && (
        <p className="text-sm text-red-500">{state.errors.general}</p>
      )}

      {state.success && state.inviteUrl && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <p className="mb-1 text-xs font-medium text-green-700">
            Invite link generated — share this with the creator:
          </p>
          <code className="block break-all rounded bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)]">
            {state.inviteUrl}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.inviteUrl!)}
            className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  )
}
