// src/modules/feed/components/HeroSection.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const BANNER_KEY = 'feed-banner-dismissed'

export function HeroSection() {
  return (
    <div
      style={{ background: 'var(--color-primary-dark)' }}
      className="w-full py-10 px-6 text-center text-white"
    >
      <h1 className="text-2xl font-bold mb-2">
        The mountain biking platform built for riders, by riders
      </h1>
      <p className="text-base opacity-80 mb-6">
        Learn skills · Explore trails · Connect with the community
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/auth/signup"
          className="px-5 py-2 rounded font-semibold text-sm"
          style={{ background: 'var(--color-primary-light)', color: '#fff' }}
        >
          Join Free
        </Link>
        <Link
          href="/auth/signin"
          className="px-5 py-2 rounded font-semibold text-sm border border-white/40 text-white"
        >
          Sign In
        </Link>
      </div>
    </div>
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
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
