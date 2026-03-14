'use client'

import { useState, useTransition } from 'react'
import { Coins } from 'lucide-react'

const TIP_AMOUNTS = [10, 25, 50, 100]

interface TipButtonProps {
  toUserId: string
  toUserName: string
  className?: string
}

export function TipButton({ toUserId, toUserName, className }: TipButtonProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(25)
  const [customAmount, setCustomAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const finalAmount = customAmount ? parseInt(customAmount, 10) : amount

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalAmount || finalAmount <= 0) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/credits/tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toUserId, amount: finalAmount }),
        })
        if (res.ok) {
          setStatus('success')
        } else {
          const data = await res.json()
          setErrorMsg(data.error ?? 'Something went wrong')
          setStatus('error')
        }
      } catch {
        setStatus('error')
        setErrorMsg('Network error')
      }
    })
  }

  if (status === 'success') {
    return (
      <span className="text-sm text-green-500">
        Tipped {finalAmount} credits to {toUserName}!
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 py-1.5 text-sm text-amber-500 transition-colors hover:bg-amber-500/10',
          className ?? '',
        ].join(' ')}
      >
        <Coins className="h-3.5 w-3.5" />
        Tip
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-xl">
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Tip {toUserName}</h4>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-1.5">
                {TIP_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAmount(a); setCustomAmount('') }}
                    className={`rounded-lg border py-1.5 text-sm font-medium transition-colors ${
                      amount === a && !customAmount
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1"
                placeholder="Custom amount..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
              />

              {status === 'error' && (
                <p className="text-xs text-[var(--color-danger)]">{errorMsg}</p>
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
                  disabled={isPending || !finalAmount || finalAmount <= 0}
                  className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {isPending ? 'Sending...' : `Send ${finalAmount}`}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
