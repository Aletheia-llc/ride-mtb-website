'use client'

import { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'

interface TipButtonProps {
  postId: string
  commentId?: string
  currentUserId?: string
  isOwnContent: boolean
}

export function TipButton({ postId, commentId, currentUserId, isOwnContent }: TipButtonProps) {
  const [tipCount, setTipCount] = useState(0)
  const [hasTipped, setHasTipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  const tipUrl = commentId
    ? `/api/forum/posts/${postId}/tip?commentId=${commentId}`
    : `/api/forum/posts/${postId}/tip`

  // Fetch initial tip count + whether current user has tipped
  useEffect(() => {
    let cancelled = false
    fetch(tipUrl)
      .then((r) => r.json())
      .then((data: { tipCount?: number; hasTipped?: boolean }) => {
        if (!cancelled) {
          setTipCount(data.tipCount ?? 0)
          setHasTipped(data.hasTipped ?? false)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInitializing(false)
      })
    return () => { cancelled = true }
  }, [tipUrl])

  const handleTip = async () => {
    if (!currentUserId) {
      setError('Sign in to tip')
      return
    }
    if (isOwnContent) {
      setError("Can't tip your own content")
      return
    }
    if (hasTipped) return
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(tipUrl, { method: 'POST' })
      const data = await res.json() as { tipCount?: number; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      setTipCount(data.tipCount ?? tipCount + 1)
      setHasTipped(true)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Clear transient error messages after 3 seconds
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 3000)
    return () => clearTimeout(t)
  }, [error])

  const tipped = hasTipped
  const disabled = loading || initializing || isOwnContent || tipped

  return (
    <div className="relative">
      <button
        onClick={handleTip}
        disabled={disabled}
        title={
          isOwnContent
            ? "Can't tip your own content"
            : tipped
            ? 'Already tipped'
            : !currentUserId
            ? 'Sign in to tip'
            : 'Tip 10 credits'
        }
        className={[
          'flex items-center gap-1 text-xs transition-colors',
          tipped
            ? 'text-[var(--color-primary)] cursor-default'
            : isOwnContent
            ? 'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]',
          loading ? 'opacity-60' : '',
        ].join(' ')}
        aria-label={tipped ? `${tipCount} tips — already tipped` : `Tip — ${tipCount} tips`}
      >
        <Coins className="h-3.5 w-3.5" />
        <span>{initializing ? '…' : tipCount > 0 ? tipCount : 'Tip'}</span>
      </button>

      {error && (
        <span className="absolute bottom-full left-0 mb-1 whitespace-nowrap rounded bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 text-xs text-red-500 shadow-md">
          {error}
        </span>
      )}
    </div>
  )
}
