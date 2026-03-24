'use client'

import { useState } from 'react'

export function VerificationBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  if (dismissed) return null

  async function handleResend() {
    setResending(true)
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST' })
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{
      background: '#fef3c7',
      borderBottom: '1px solid #fcd34d',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      fontSize: '0.875rem',
      color: '#92400e',
    }}>
      <span>
        {resent
          ? 'Verification email sent — check your inbox.'
          : 'Please verify your email address to unlock all features.'}
      </span>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
        {!resent && (
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              background: 'none',
              border: '1px solid #92400e',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '0.8rem',
              color: '#92400e',
              cursor: resending ? 'default' : 'pointer',
              opacity: resending ? 0.6 : 1,
            }}
          >
            {resending ? 'Sending…' : 'Resend email'}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#92400e',
            fontSize: '1rem',
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
