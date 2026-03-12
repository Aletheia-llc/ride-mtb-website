// src/modules/feed/components/HeroSection.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const BANNER_KEY = 'feed-banner-dismissed'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-hero-from)] via-[var(--color-bg)] to-[var(--color-bg)] py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-hero-glow),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          The mountain biking platform<br className="hidden sm:block" /> built for riders, by riders
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-[var(--color-text-muted)]">
          Learn skills · Explore trails · Connect with the community
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-all hover:-translate-y-px hover:bg-[var(--color-primary-dark)] hover:shadow-[0_4px_20px_rgba(45,106,79,0.3)]"
          >
            Join Free
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-3 font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
          >
            Sign In
          </Link>
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
