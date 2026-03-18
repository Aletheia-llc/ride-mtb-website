// src/modules/bikes/components/garage/ShareButton.tsx
'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API not available (non-HTTPS or permissions denied)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
