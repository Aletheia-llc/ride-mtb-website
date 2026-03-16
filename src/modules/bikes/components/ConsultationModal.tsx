'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Calendar } from 'lucide-react'

interface ConsultationModalProps {
  open: boolean
  onClose: () => void
  quizSessionId?: string
  budget?: number
  onSubmitted?: () => void
}

interface FormState {
  name: string
  email: string
  phone: string
  ridingGoals: string
  specificQuestions: string
  budgetRange: string
}

export function ConsultationModal({ open, onClose, quizSessionId, budget, onSubmitted }: ConsultationModalProps) {
  const calComLink = process.env.NEXT_PUBLIC_CALCOM_LINK
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState<'form' | 'schedule'>('form')
  const [error, setError] = useState<string | null>(null)

  const defaultBudgetRange = budget
    ? `$${(budget - 500).toLocaleString()}–$${(budget + 500).toLocaleString()}`
    : ''

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    ridingGoals: '',
    specificQuestions: '',
    budgetRange: defaultBudgetRange,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
      // Reset to form stage when closed
      setStage('form')
    }
  }, [open])

  function handleField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bikes/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quizSessionId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Submission failed')
      }
      onSubmitted?.()
      setStage(calComLink ? 'schedule' : 'form')
      if (!calComLink) {
        // No Cal.com link — just close after a moment
        setTimeout(onClose, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
  const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1"

  return (
    <dialog
      ref={dialogRef}
      className={`m-auto max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-2xl backdrop:bg-black/60 ${stage === 'schedule' ? 'max-w-2xl' : 'max-w-lg'}`}
      onClose={onClose}
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            {stage === 'schedule' ? (
              <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-[var(--color-primary)]" />Pick a Time</span>
            ) : 'Book a Consultation'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {stage === 'schedule' && calComLink ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(34,197,94,0.06)] p-3 text-center">
              <p className="text-sm font-semibold text-[var(--color-success)]">Request received!</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Now pick a time that works for you.</p>
            </div>
            <iframe
              src={`${calComLink}?name=${encodeURIComponent(form.name)}&email=${encodeURIComponent(form.email)}`}
              className="h-[480px] w-full rounded-lg border border-[var(--color-border)]"
              title="Schedule a consultation"
            />
            <button
              onClick={onClose}
              className="text-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input className={inputClass} value={form.name} onChange={(e) => handleField('name', e.target.value)} required placeholder="Your name" />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input className={inputClass} type="email" value={form.email} onChange={(e) => handleField('email', e.target.value)} required placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.phone} onChange={(e) => handleField('phone', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>Riding goals *</label>
              <textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.ridingGoals} onChange={(e) => handleField('ridingGoals', e.target.value)} required placeholder="What do you want to do on a mountain bike?" />
            </div>
            <div>
              <label className={labelClass}>Specific questions</label>
              <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.specificQuestions} onChange={(e) => handleField('specificQuestions', e.target.value)} placeholder="Anything specific you want advice on?" />
            </div>
            <div>
              <label className={labelClass}>Budget range</label>
              <input className={inputClass} value={form.budgetRange} onChange={(e) => handleField('budgetRange', e.target.value)} placeholder="e.g. $3,000–$5,000" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}
