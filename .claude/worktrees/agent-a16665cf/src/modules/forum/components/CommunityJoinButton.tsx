'use client'

import { useState, useTransition } from 'react'
// eslint-disable-next-line no-restricted-imports
import { joinForumCommunity, leaveForumCommunity } from '@/modules/forum/actions/communityMembership'

interface CommunityJoinButtonProps {
  categoryId: string
  initialMember: boolean
  className?: string
}

export function CommunityJoinButton({ categoryId, initialMember, className }: CommunityJoinButtonProps) {
  const [isMember, setIsMember] = useState(initialMember)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      if (isMember) {
        await leaveForumCommunity(categoryId)
        setIsMember(false)
      } else {
        await joinForumCommunity(categoryId)
        setIsMember(true)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={[
        'rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50',
        isMember
          ? 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-400 hover:text-red-500'
          : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]',
        className ?? '',
      ].join(' ')}
    >
      {isPending ? '...' : isMember ? 'Leave' : 'Join'}
    </button>
  )
}
