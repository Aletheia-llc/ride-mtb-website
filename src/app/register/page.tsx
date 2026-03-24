import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { RegisterForm } from './RegisterForm'

interface RegisterPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  const rawCallback = (await searchParams).callbackUrl
  const callbackUrl = rawCallback?.startsWith('/') ? rawCallback : '/dashboard'

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
          Create your account
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Join the Ride MTB community.
        </p>
        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
