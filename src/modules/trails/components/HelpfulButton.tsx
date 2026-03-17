'use client'

import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { toggleReviewHelpful } from '../actions/toggleReviewHelpful'

interface HelpfulButtonProps {
  reviewId: string
  initialCount: number
  initialHasMarked?: boolean
  isAuthenticated: boolean
}

export function HelpfulButton({ reviewId, initialCount, initialHasMarked = false, isAuthenticated }: HelpfulButtonProps) {
  const [count, setCount] = useState(initialCount)
  const [marked, setMarked] = useState(initialHasMarked)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthenticated || loading) return
    setLoading(true)
    try {
      await toggleReviewHelpful(reviewId)
      setCount((c) => marked ? c - 1 : c + 1)
      setMarked((m) => !m)
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
      className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
        marked
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
      }`}
    >
      <ThumbsUp className="h-3.5 w-3.5" />
      {count > 0 && <span>{count}</span>}
      <span>Helpful</span>
    </button>
  )
}
