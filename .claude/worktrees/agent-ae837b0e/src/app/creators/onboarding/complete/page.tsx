import Link from 'next/link'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export default async function CreatorOnboardingCompletePage() {
  const user = await requireAuth()

  const profile = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { status: true, displayName: true },
  })

  const isActive = profile?.status === 'active'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
          {isActive ? "You're live!" : 'Application submitted!'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {isActive
            ? `Welcome to the Ride MTB creator program, ${profile?.displayName}. Head to your creator dashboard to get started.`
            : "Your Stripe details have been submitted. We'll activate your creator account once Stripe completes verification (usually within a few hours)."}
        </p>
        {isActive ? (
          <Link
            href="/dashboard/creator"
            style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
          >
            Go to Creator Dashboard →
          </Link>
        ) : (
          <Link
            href="/dashboard"
            style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
          >
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}
