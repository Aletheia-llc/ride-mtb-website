// src/modules/feed/components/HeroSection.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { X, Mountain, MapPin, Store, Users } from 'lucide-react'

const BANNER_KEY = 'feed-banner-dismissed'

interface HeroStats {
  trailCount: number
  shopCount: number
  riderCount: number
}

function formatStat(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`
  return String(n)
}

const FEATURES = [
  { icon: Mountain, title: 'Explore Trails', desc: 'GPS maps, conditions, and reviews', href: '/trails/explore' },
  { icon: MapPin, title: 'Find Shops', desc: 'Bike shops and services near you', href: '/shops' },
  { icon: Store, title: 'Buy & Sell', desc: 'Gear marketplace for riders', href: '/buy-sell' },
  { icon: Users, title: 'Community', desc: 'Forum, events, and ride groups', href: '/forum' },
]

export function HeroSection({ stats }: { stats?: HeroStats }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-hero-from)] via-[var(--color-bg)] to-[var(--color-bg)] py-16 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-hero-glow),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          The mountain biking platform<br className="hidden sm:block" /> built for riders, by riders
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-[var(--color-text-muted)]">
          Learn skills · Explore trails · Connect with the community
        </p>

        {/* Live stats */}
        {stats && (
          <div className="mb-8 flex flex-wrap justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">{formatStat(stats.trailCount)}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Trails</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">{formatStat(stats.shopCount)}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Bike Shops</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">{formatStat(stats.riderCount)}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Riders</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-all hover:-translate-y-px hover:bg-[var(--color-primary-dark)] hover:shadow-[0_4px_20px_rgba(45,106,79,0.3)]"
          >
            Join Free
          </Link>
          <Link
            href="/trails/explore"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-3 font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
          >
            Explore Trails
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30 hover:shadow-md"
            >
              <f.icon className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
              <p className="text-sm font-semibold text-[var(--color-text)]">{f.title}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeedBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(BANNER_KEY) === '1')
  }, [])

  if (dismissed) return null

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-sm mb-3">
      <span>Sign up to personalize your feed →</span>
      <button
        onClick={() => {
          localStorage.setItem(BANNER_KEY, '1')
          setDismissed(true)
        }}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
