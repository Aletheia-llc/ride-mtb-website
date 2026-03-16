'use client'

import Image from 'next/image'
import { RotateCcw, ExternalLink } from 'lucide-react'
import { Button } from '@/ui/components'
import { Card } from '@/ui/components'
import { Badge } from '@/ui/components'
import type { SpectrumResult } from '../types'
import { CATEGORY_META } from '../lib/constants'
import { SpectrumDisplay } from './SpectrumDisplay'
import { ScoreBreakdown } from './ScoreBreakdown'

const CATEGORY_IMAGES: Record<number, string> = {
  1: '/images/categories/gravel.svg',
  3: '/images/categories/xc.svg',
  5: '/images/categories/trail.svg',
  7: '/images/categories/enduro.svg',
  9: '/images/categories/downhill.svg',
}

interface ResultsViewProps {
  result: SpectrumResult
  onRetake: () => void
}

export function ResultsView({ result, onRetake }: ResultsViewProps) {
  const calComLink = process.env.NEXT_PUBLIC_CALCOM_LINK
  const heroImage = CATEGORY_IMAGES[result.primaryCategory]

  const categoryLabels = Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [Number(k), { name: v.name }]),
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Hero card with category image */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm">
        {/* Hero image section */}
        <div className="relative flex min-h-[220px] items-end overflow-hidden p-6">
          {heroImage && (
            <Image
              src={heroImage}
              alt={result.categoryName}
              fill
              sizes="(min-width: 640px) 672px, 100vw"
              className="object-cover object-[center_30%]"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.05) 100%)',
            }}
          />
          <div className="relative z-10 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Your match</p>
            <h1 className="text-2xl font-bold leading-tight text-white">{result.categoryName}</h1>
            <p className="text-sm leading-relaxed text-white/85">{result.categoryDescription}</p>
          </div>
        </div>

        {/* Key specs row */}
        <div className="flex flex-wrap gap-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-4">
          {result.travelRange && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Travel</span>
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {result.travelRange.min}–{result.travelRange.max}mm
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Wheels</span>
            <span className="text-sm font-semibold text-[var(--color-text)]">{result.wheelConfig}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Size</span>
            <span className="text-sm font-semibold text-[var(--color-text)]">{result.recommendedSize}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Budget</span>
            <span className="text-sm font-semibold text-[var(--color-text)]">${result.budget.toLocaleString()}</span>
          </div>
          {result.ebike && (
            <div className="flex items-end">
              <Badge variant="warning">E-Bike</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Spectrum */}
      <Card>
        <SpectrumDisplay
          value={result.rawScore}
          categories={categoryLabels}
        />
      </Card>

      {/* Why it matches */}
      <div
        className="rounded-xl border p-5"
        style={{
          background: 'rgba(34, 197, 94, 0.06)',
          borderColor: 'rgba(34, 197, 94, 0.2)',
        }}
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-success)]">Why this matches</h2>
        <ul className="flex flex-col gap-1.5">
          {result.whyMatches.map((reason, i) => (
            <li
              key={i}
              className="relative pl-4 text-sm leading-relaxed text-[var(--color-text-muted)]"
              style={{ paddingLeft: '1rem' }}
            >
              <span
                className="absolute left-0 font-semibold text-[var(--color-success)]"
                style={{ fontSize: '0.75rem' }}
              >
                ✓
              </span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Fit notes */}
      {result.fitNotes.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            borderColor: 'rgba(245, 158, 11, 0.2)',
          }}
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-warning)]">Fit notes</h2>
          <ul className="flex flex-col gap-1.5">
            {result.fitNotes.map((note, i) => (
              <li
                key={i}
                className="relative pl-4 text-sm leading-relaxed text-[var(--color-text-muted)]"
              >
                <span className="absolute left-0 text-xs">⚠</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">Also consider</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.alternatives.map((alt) => {
              const altImage = CATEGORY_IMAGES[alt.categoryNumber]
              return (
                <div
                  key={alt.categoryNumber}
                  className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <div className="relative aspect-square overflow-hidden">
                    {altImage && (
                      <Image
                        src={altImage}
                        alt={alt.categoryName}
                        fill
                        sizes="(min-width: 640px) 336px, 100vw"
                        className="object-cover object-[center_30%]"
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.05) 100%)',
                      }}
                    />
                    <h3 className="absolute inset-x-0 bottom-0 z-10 p-3 text-base font-bold text-white">{alt.categoryName}</h3>
                  </div>
                  <p className="px-4 py-3 text-sm italic text-[var(--color-text-muted)]">{alt.reason}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Score breakdown */}
      <ScoreBreakdown breakdown={result.scoreBreakdown} />

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button variant="secondary" onClick={onRetake}>
          <RotateCcw className="h-4 w-4" />
          Retake quiz
        </Button>
        {calComLink && (
          <Button
            variant="primary"
            onClick={() => window.open(calComLink, '_blank')}
          >
            Book a consultation
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
