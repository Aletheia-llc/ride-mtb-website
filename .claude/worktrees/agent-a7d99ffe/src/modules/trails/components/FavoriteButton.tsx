'use client'

import { useOptimistic, useTransition } from 'react'
import { Button } from '@/ui/components'

interface FavoriteButtonProps {
  trailId: string
  isFavorited: boolean
  favoriteCount: number
  isAuthenticated: boolean
}

export function FavoriteButton({
  trailId,
  isFavorited,
  favoriteCount,
  isAuthenticated,
}: FavoriteButtonProps) {
  const [optimistic, setOptimistic] = useOptimistic(
    { favorited: isFavorited, count: favoriteCount },
    (current, toggled: boolean) => ({
      favorited: toggled,
      count: current.count + (toggled ? 1 : -1),
    }),
  )
  const [isPending, startTransition] = useTransition()

  async function handleToggle() {
    if (!isAuthenticated) return

    startTransition(async () => {
      const next = !optimistic.favorited
      setOptimistic(next)

      try {
        await fetch(`/api/trails/${trailId}/favorite`, {
          method: 'POST',
        })
      } catch {
        // Revert handled by React optimistic on next render
      }
    })
  }

  return (
    <Button
      variant={optimistic.favorited ? 'primary' : 'secondary'}
      size="sm"
      onClick={handleToggle}
      disabled={!isAuthenticated || isPending}
      title={!isAuthenticated ? 'Sign in to favorite' : undefined}
    >
      <svg
        className="h-4 w-4"
        fill={optimistic.favorited ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {optimistic.count > 0 && (
        <span>{optimistic.count}</span>
      )}
    </Button>
  )
}
