'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

interface FavoriteButtonProps {
  listingId: string
  initialFavorited: boolean
  initialCount: number
  isLoggedIn: boolean
}

export function FavoriteButton({ listingId, initialFavorited, initialCount, isLoggedIn }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    if (!isLoggedIn) {
      router.push('/signin')
      return
    }
    setPending(true)
    const res = await fetch('/api/marketplace/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
      setCount((c) => data.favorited ? c + 1 : Math.max(0, c - 1))
    }
    setPending(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className="flex items-center gap-1 text-sm transition-colors disabled:opacity-50"
    >
      <Heart
        size={16}
        className={favorited ? 'fill-red-500 text-red-500' : 'text-[var(--color-text-muted)] hover:text-red-400'}
      />
      {count > 0 && <span className={`text-xs ${favorited ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>{count}</span>}
    </button>
  )
}
