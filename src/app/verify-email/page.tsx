export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams

  if (!token) {
    redirect('/signin')
  }

  let record
  try {
    record = await db.verificationToken.findFirst({
      where: { token, identifier: { startsWith: 'verify:' } },
    })
  } catch {
    return <Result error="Something went wrong. Please try again or request a new verification email." />
  }

  if (!record) {
    return <Result error="This verification link is invalid or has already been used." />
  }

  if (record.expires < new Date()) {
    return <Result error="This verification link has expired. Please request a new one from your account settings." />
  }

  const email = record.identifier.replace(/^verify:/, '')

  try {
    await db.$transaction([
      db.user.updateMany({ where: { email }, data: { emailVerified: new Date() } }),
      db.verificationToken.delete({ where: { token } }),
    ])
  } catch {
    return <Result error="Something went wrong while verifying your email. Please try again." />
  }

  redirect('/dashboard?verified=1')
}

function Result({ error }: { error: string }) {
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
        maxWidth: '440px',
        padding: '2.5rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚵</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text)' }}>
          Verification Error
        </h1>
        <p style={{ color: 'var(--color-error, #ef4444)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
        <a href="/signin" style={{
          display: 'inline-block',
          padding: '0.6rem 1.5rem',
          background: '#22c55e',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}>
          Back to Sign In
        </a>
      </div>
    </div>
  )
}
