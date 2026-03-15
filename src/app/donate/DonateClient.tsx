'use client'

import { useState, useTransition } from 'react'

const PRESET_AMOUNTS = [5, 10, 25, 50, 100]

interface DonateClientProps {
  donated: boolean
}

export function DonateClient({ donated }: DonateClientProps) {
  const [selected, setSelected] = useState<number | null>(25)
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const effectiveAmount = useCustom ? parseFloat(custom) || 0 : (selected ?? 0)

  function handlePreset(amount: number) {
    setSelected(amount)
    setUseCustom(false)
    setCustom('')
  }

  function handleCustomClick() {
    setUseCustom(true)
    setSelected(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(effectiveAmount * 100)
    if (amountCents < 100) {
      setError('Minimum donation is $1.00')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/donate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      window.location.href = data.url
    })
  }

  if (donated) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: '2.5rem',
          textAlign: 'center',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🙌</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Thank you!</h2>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Your support means everything. You&apos;re helping keep Ride MTB free, independent, and
          built for the community — not advertisers.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '2.5rem',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
        Choose an amount
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
        One-time contribution — no account required.
      </p>

      {/* Preset buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {PRESET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handlePreset(amount)}
            style={{
              padding: '10px 0',
              borderRadius: 8,
              border: `2px solid ${selected === amount && !useCustom ? '#22c55e' : 'var(--color-border)'}`,
              background: selected === amount && !useCustom ? 'rgba(34,197,94,0.08)' : 'var(--color-bg)',
              color: selected === amount && !useCustom ? '#22c55e' : 'var(--color-text)',
              fontWeight: selected === amount && !useCustom ? 700 : 400,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ${amount}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustomClick}
          style={{
            padding: '10px 0',
            borderRadius: 8,
            border: `2px solid ${useCustom ? '#22c55e' : 'var(--color-border)'}`,
            background: useCustom ? 'rgba(34,197,94,0.08)' : 'var(--color-bg)',
            color: useCustom ? '#22c55e' : 'var(--color-text)',
            fontWeight: useCustom ? 700 : 400,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Other
        </button>
      </div>

      {/* Custom amount input */}
      {useCustom && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              fontSize: '1rem',
            }}
          >
            $
          </span>
          <input
            type="number"
            min="1"
            step="any"
            placeholder="Enter amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px 10px 26px',
              border: '2px solid #22c55e',
              borderRadius: 8,
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '1rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || effectiveAmount <= 0}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: 'none',
          background: '#22c55e',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.05rem',
          cursor: isPending || effectiveAmount <= 0 ? 'not-allowed' : 'pointer',
          opacity: isPending || effectiveAmount <= 0 ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {isPending
          ? 'Redirecting...'
          : effectiveAmount > 0
            ? `Donate $${effectiveAmount % 1 === 0 ? effectiveAmount : effectiveAmount.toFixed(2)}`
            : 'Donate'}
      </button>

      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.75rem',
          textAlign: 'center',
          marginTop: 12,
        }}
      >
        Processed securely by Stripe. No account required.
      </p>
    </form>
  )
}
