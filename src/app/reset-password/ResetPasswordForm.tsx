'use client'

import { useActionState } from 'react'
import { resetPassword } from './actions'

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: 4,
  color: 'var(--color-text-muted)',
  textAlign: 'left',
}

export function ResetPasswordForm({ token }: { token: string }) {
  const boundAction = resetPassword.bind(null, token)
  const [state, formAction, isPending] = useActionState(boundAction, null)

  return (
    <form action={formAction} style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="password" style={labelStyle}>New password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="confirm" style={labelStyle}>Confirm new password</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
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
        {isPending ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}
