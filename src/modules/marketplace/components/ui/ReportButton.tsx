'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Flag, X } from 'lucide-react'
import { reportListing } from '@/modules/marketplace/actions/reports'

const REASONS = [
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'prohibited_item', label: 'Prohibited Item' },
  { value: 'wrong_category', label: 'Wrong Category' },
  { value: 'offensive', label: 'Offensive Content' },
  { value: 'other', label: 'Other' },
] as const

interface ReportButtonProps {
  listingId: string
}

export function ReportButton({ listingId }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleSubmit() {
    if (!reason) {
      setError('Please select a reason.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await reportListing(listingId, reason, details || undefined)
        setSubmitted(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to submit report.',
        )
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
        <Flag className="h-3.5 w-3.5 text-amber-500" />
        <span>Report submitted. We&apos;ll review this listing.</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)] cursor-pointer"
      >
        <Flag className="h-3.5 w-3.5" />
        <span>Report</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">Report Listing</h4>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reason select */}
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">Select a reason...</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Details textarea */}
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            Details (optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe the issue..."
            rows={3}
            maxLength={1000}
            className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)]"
          />

          {/* Error */}
          {error && (
            <p className="mb-2 text-xs text-red-500">{error}</p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}
    </div>
  )
}
