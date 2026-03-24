'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { credentialsSignIn } from './actions'

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const boundAction = credentialsSignIn.bind(null, callbackUrl)
  const [error, formAction, isPending] = useActionState(boundAction, null)

  return (
    <form action={formAction}>
      <div style={{ marginBottom: 12 }}>
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
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <label
            htmlFor="password"
            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}
          >
            Password
          </label>
          <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 500 }}>
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 12 }}>
          {error}
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
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Don&apos;t have an account?{' '}
        <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Create one
        </Link>
      </p>
    </form>
  )
}
