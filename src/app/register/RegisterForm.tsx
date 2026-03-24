'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerUser } from './actions'

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

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const boundAction = registerUser.bind(null, callbackUrl)
  const [state, formAction, isPending] = useActionState(boundAction, null)

  return (
    <form action={formAction} style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="username" style={labelStyle}>Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="confirm" style={labelStyle}>Confirm password</label>
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
        {isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <Link href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </form>
  )
}
