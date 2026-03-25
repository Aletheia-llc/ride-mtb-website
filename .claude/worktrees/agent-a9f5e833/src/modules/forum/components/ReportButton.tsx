'use client'

import { useState, useTransition } from 'react'
import { Flag } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { reportForumPost, reportForumThread } from '@/modules/forum/actions/reportContent'

const REPORT_REASONS = [
  'Spam',
  'Harassment or hate speech',
  'Misinformation',
  'Inappropriate content',
  'Off-topic',
  'Other',
]

interface ReportButtonProps {
  targetType: 'post' | 'thread'
  targetId: string
  className?: string
}

export function ReportButton({ targetType, targetId, className }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalReason = reason === 'Other' ? customReason : reason
    if (!finalReason.trim()) return

    startTransition(async () => {
      if (targetType === 'post') {
        await reportForumPost(targetId, finalReason)
      } else {
        await reportForumThread(targetId, finalReason)
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <span className="text-xs text-[var(--color-text-muted)]">Reported</span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex items-center gap-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-red-500',
          className ?? '',
        ].join(' ')}
        title="Report"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div className="absolute right-0 top-6 z-50 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-xl">
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Report content</h4>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-[var(--color-primary)]"
                    />
                    {r}
                  </label>
                ))}
              </div>

              {reason === 'Other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reason || isPending}
                  className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {isPending ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
