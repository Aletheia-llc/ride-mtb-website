'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          Reset your password
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {state?.success ? (
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              If an account exists for that email, you&apos;ll receive a password reset link shortly. Check your spam folder if it doesn&apos;t arrive.
            </p>
            <Link
              href="/signin"
              style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                style={inputStyle}
              />
            </div>

            {state?.error && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 12 }}>
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isPending ? 'Sending…' : 'Send reset link'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <Link href="/signin" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
