'use client'

import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { toggleReviewHelpful } from '../actions/toggleReviewHelpful'

interface HelpfulButtonProps {
  reviewId: string
  initialCount: number
  isAuthenticated: boolean
}

export function HelpfulButton({ reviewId, initialCount, isAuthenticated }: HelpfulButtonProps) {
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthenticated || loading) return
    setLoading(true)
    try {
      await toggleReviewHelpful(reviewId)
      // Optimistic: just show +1, real count updates on refresh
      setCount((c) => c + 1)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isAuthenticated || loading}
      className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)] disabled:opacity-50"
    >
      <ThumbsUp className="h-3.5 w-3.5" />
      {count > 0 && <span>{count}</span>}
      <span>Helpful</span>
    </button>
  )
}
