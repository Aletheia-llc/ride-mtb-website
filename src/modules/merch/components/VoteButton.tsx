'use client'

import { useActionState } from 'react'
import { voteForDesign, removeVote } from '@/modules/merch/actions/contests'

interface VoteButtonProps {
  submissionId: string
  voteCount: number
  hasVoted: boolean
  isVotingOpen: boolean
  isAuthenticated: boolean
}

export function VoteButton({
  submissionId,
  voteCount,
  hasVoted,
  isVotingOpen,
  isAuthenticated,
}: VoteButtonProps) {
  const action = hasVoted ? removeVote : voteForDesign

  const [_state, formAction, pending] = useActionState(
    async (_prev: null, _formData: FormData) => {
      await action(submissionId)
      return null
    },
    null,
  )

  if (!isVotingOpen || !isAuthenticated) {
    return (
      <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
        <span>▲</span>
        <span>{voteCount}</span>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        style={
          hasVoted
            ? {
                background: 'var(--color-primary)',
                color: '#fff',
              }
            : {
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                background: 'var(--color-surface)',
              }
        }
      >
        <span>▲</span>
        <span>{voteCount}</span>
      </button>
    </form>
  )
}
