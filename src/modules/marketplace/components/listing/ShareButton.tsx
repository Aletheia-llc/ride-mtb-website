'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

interface ShareButtonProps {
  slug: string
  title: string
}

export function ShareButton({ slug, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/marketplace/${slug}`

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // User cancelled share — no-op
      }
      return
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently ignore clipboard errors
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)] cursor-pointer"
      aria-label="Share listing"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[var(--color-success)]" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </>
      )}
    </button>
  )
}
