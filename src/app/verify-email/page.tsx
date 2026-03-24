import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams

  if (!token) {
    redirect('/dashboard')
  }

  const record = await db.verificationToken.findFirst({
    where: { token, identifier: { startsWith: 'verify:' } },
  })

  if (!record) {
    return <Result error="This verification link is invalid or has already been used." />
  }

  if (record.expires < new Date()) {
    return <Result error="This verification link has expired. Please request a new one from your account settings." />
  }

  const email = record.identifier.replace(/^verify:/, '')

  await db.$transaction([
    db.user.updateMany({ where: { email }, data: { emailVerified: new Date() } }),
    db.verificationToken.delete({ where: { token } }),
  ])

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
        <p style={{ color: 'var(--color-error, #ef4444)', marginBottom: '1rem' }}>{error}</p>
        <a href="/dashboard" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>
          Go to dashboard
        </a>
      </div>
    </div>
  )
}
