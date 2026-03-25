import type { Metadata } from 'next'
import Link from 'next/link'
import { Bike, ChevronRight, Mountain, Zap, Target } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { CATEGORY_META } from '@/modules/bikes/lib/constants'

export const metadata: Metadata = {
  title: 'Bikes | Ride MTB',
  description: 'Find your perfect mountain bike. Our quiz matches you to the right category based on your riding style, terrain, and preferences.',
}

const HOW_IT_WORKS = [
  {
    icon: Target,
    title: 'Tell us how you ride',
    description: '6 quick questions about terrain, experience, and priorities.',
  },
  {
    icon: Zap,
    title: 'We crunch the numbers',
    description: 'Our 1–9 spectrum algorithm finds your ideal category.',
  },
  {
    icon: Bike,
    title: 'Get your match',
    description: 'See your perfect category with fit notes and alternatives.',
  },
]

export default function BikesPage() {
  const categories = Object.entries(CATEGORY_META).map(([num, meta]) => ({
    number: Number(num),
    ...meta,
  }))

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Hero */}
      <div className="mb-16 text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-[var(--color-primary)]">
          <Mountain className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Bike Selector</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          Find Your Perfect<br />Mountain Bike
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-[var(--color-text-muted)]">
          Answer 6 quick questions about your riding style and we&apos;ll match you to the right bike category &mdash; from gravel to full downhill.
        </p>
        <Link
          href="/bikes/selector"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          Start the Quiz
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {/* How it works */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-[var(--color-text)]">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, title, description }, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                <Icon className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--color-text)]">{title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The spectrum */}
      <div className="mb-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-[var(--color-text)]">The Spectrum</h2>
        <p className="mb-8 text-center text-sm text-[var(--color-text-muted)]">From smooth gravel to full-send downhill — every rider fits somewhere on the 1–9 scale.</p>
        <div className="grid gap-4 sm:grid-cols-5">
          {categories.map(({ number, name, description, travelRange }) => (
            <div
              key={number}
              className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
                style={{ background: `hsl(${140 - number * 12}, 70%, 40%)` }}
              >
                {number}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">{name}</h3>
              <p className="mb-2 text-xs leading-relaxed text-[var(--color-text-muted)]">{description}</p>
              {travelRange && (
                <p className="mt-auto text-xs font-medium text-[var(--color-primary)]">
                  {travelRange.min}–{travelRange.max}mm travel
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-10 text-center">
        <h2 className="mb-3 text-2xl font-bold text-[var(--color-text)]">Ready to find your match?</h2>
        <p className="mb-6 text-[var(--color-text-muted)]">Takes about 2 minutes. No account required.</p>
        <Link
          href="/bikes/selector"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <Bike className="h-5 w-5" />
          Start the Quiz
        </Link>
      </div>
    </div>
  )
}
