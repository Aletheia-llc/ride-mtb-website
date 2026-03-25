interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function CreatorStripePage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Step 2 of 2
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
            Connect your Stripe account
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Ride MTB uses Stripe to send creator payouts. You&apos;ll be redirected to Stripe to
            verify your identity and add your bank account.
          </p>
        </div>

        {error === 'stripe_unavailable' && (
          <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Stripe is temporarily unavailable. Please try again in a moment.
          </p>
        )}

        <a
          href="/api/creators/stripe-connect"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
        >
          Continue to Stripe →
        </a>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          You&apos;ll need your government ID and bank account details.
        </p>
      </div>
    </div>
  )
}
