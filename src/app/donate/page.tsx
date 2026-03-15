import type { Metadata } from 'next'
import Link from 'next/link'
import { DonateClient } from './DonateClient'

export const metadata: Metadata = {
  title: 'Support Ride MTB | Donate',
  description:
    'Help keep Ride MTB free, independent, and community-owned. Your contribution supports trail maps, free content, and a platform built for riders — not advertisers.',
  openGraph: {
    title: 'Support Ride MTB',
    description:
      'Help keep Ride MTB free, independent, and community-owned. Your contribution supports trail maps, free content, and a platform built for riders.',
    type: 'website',
  },
}

const IMPACT = [
  {
    icon: '🎥',
    title: 'Free Content',
    body: 'Tutorials, skill breakdowns, and technique guides — always free, never paywalled.',
  },
  {
    icon: '🗺️',
    title: 'Trail Maps',
    body: 'Maintaining and expanding our trail database across hundreds of riding areas.',
  },
  {
    icon: '🤝',
    title: 'Community Features',
    body: 'Forum, events, group rides, and tools that help riders connect in the real world.',
  },
  {
    icon: '📵',
    title: 'Fewer Ads',
    body: 'Every dollar of community support means less reliance on advertising revenue.',
  },
]

const OTHER_WAYS = [
  {
    title: 'Shop Through Our Links',
    body: 'Buy gear from our partner retailers through the shop directory. We earn a small commission at no cost to you.',
    cta: 'Browse Shops',
    href: '/shops',
  },
  {
    title: 'Spread the Word',
    body: 'Share Ride MTB with your riding crew. Word of mouth is the best way to grow a genuine community.',
    cta: null,
    href: null,
  },
]

interface DonatePageProps {
  searchParams: Promise<{ donated?: string }>
}

export default async function DonatePage({ searchParams }: DonatePageProps) {
  const params = await searchParams
  const donated = params.donated === 'true'

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
          padding: '5rem 1.5rem 4rem',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Community Supported
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>
            Support Ride MTB
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6, marginBottom: 0 }}>
            We&apos;re building the platform we always wished existed — free for riders, built by
            riders. Your support helps make that possible.
          </p>
        </div>
      </section>

      {/* Donate form */}
      <section
        style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: '4rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '3rem',
          alignItems: 'start',
        }}
      >
        {/* Left: copy */}
        <div>
          <h2
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}
          >
            Invest in a Rider-Owned Platform
          </h2>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: 20, fontSize: '1rem' }}>
            Mountain biking content and community tools are dominated by platforms that prioritize
            advertising dollars over rider experience. We&apos;re different — and we want to stay
            that way.
          </p>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '1rem' }}>
            Your contribution, however small, goes directly toward keeping the lights on, the maps
            updated, and the community features free. No corporate ownership. No venture capital.
            Just riders building for riders.
          </p>
        </div>

        {/* Right: form */}
        <DonateClient donated={donated} />
      </section>

      {/* Impact */}
      <section
        style={{
          background: 'var(--color-bg-secondary)',
          padding: '4rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              fontWeight: 800,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Your Gift Makes a Difference
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              marginBottom: '2.5rem',
              maxWidth: 520,
              margin: '0 auto 2.5rem',
            }}
          >
            Here&apos;s where your contribution goes.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {IMPACT.map((item) => (
              <div
                key={item.title}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '1.5rem',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: '1rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other ways */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              fontWeight: 800,
              marginBottom: '2rem',
            }}
          >
            Other Ways to Help
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {OTHER_WAYS.map((way) => (
              <div
                key={way.title}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '1.75rem',
                }}
              >
                <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: '1.05rem' }}>{way.title}</h3>
                <p
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    marginBottom: way.cta ? 16 : 0,
                  }}
                >
                  {way.body}
                </p>
                {way.cta && way.href && (
                  <Link
                    href={way.href}
                    style={{
                      display: 'inline-block',
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: '1.5px solid var(--color-border)',
                      color: 'var(--color-text)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {way.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.8rem',
        }}
      >
        Ride MTB is an independent platform. Contributions are not tax-deductible. Questions?{' '}
        <a href="mailto:hello@ride-mtb.com" style={{ color: 'inherit' }}>
          hello@ride-mtb.com
        </a>
      </div>
    </div>
  )
}
