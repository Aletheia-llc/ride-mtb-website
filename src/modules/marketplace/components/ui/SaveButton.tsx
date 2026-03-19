'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { saveListing, unsaveListing } from '@/modules/marketplace/actions/saves'

interface SaveButtonProps {
  listingId: string
  initialSaved: boolean
  saveCount: number
  /** "card" renders a compact overlay button; "detail" renders a larger inline button */
  variant?: 'card' | 'detail'
}

export function SaveButton({
  listingId,
  initialSaved,
  saveCount,
  variant = 'card',
}: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [count, setCount] = useState(saveCount)
  const [isPending, startTransition] = useTransition()

  function handleToggle(e: React.MouseEvent) {
    // Prevent navigation when inside a link (ListingCard)
    e.preventDefault()
    e.stopPropagation()

    // Optimistic update
    const wasSaved = saved
    setSaved(!wasSaved)
    setCount((prev) => prev + (wasSaved ? -1 : 1))

    startTransition(async () => {
      try {
        if (wasSaved) {
          await unsaveListing(listingId)
        } else {
          await saveListing(listingId)
        }
      } catch {
        // Revert on error
        setSaved(wasSaved)
        setCount((prev) => prev + (wasSaved ? 1 : -1))
      }
    })
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-50 cursor-pointer"
        aria-label={saved ? 'Unsave listing' : 'Save listing'}
      >
        <Heart
          className={`h-3.5 w-3.5 transition-colors ${saved ? 'fill-red-500 text-red-500' : 'text-white'}`}
        />
        {count > 0 && (
          <span className="text-xs font-medium">{count}</span>
        )}
      </button>
    )
  }

  // Detail variant
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
        saved
          ? 'border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
      } disabled:opacity-50`}
      aria-label={saved ? 'Unsave listing' : 'Save listing'}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${saved ? 'fill-red-500 text-red-500' : ''}`}
      />
      <span>{saved ? 'Saved' : 'Save'}</span>
      {count > 0 && (
        <span className="text-xs text-[var(--color-text-muted)]">({count})</span>
      )}
    </button>
  )
}
