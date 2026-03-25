'use client'

import { Bike, RotateCcw, ExternalLink } from 'lucide-react'
import { Button } from '@/ui/components'
import { Card } from '@/ui/components'
import { Badge } from '@/ui/components'
import type { SpectrumResult } from '../types'
import { CATEGORY_META } from '../lib/constants'
import { SpectrumDisplay } from './SpectrumDisplay'
import { ScoreBreakdown } from './ScoreBreakdown'

interface ResultsViewProps {
  result: SpectrumResult
  onRetake: () => void
}

export function ResultsView({ result, onRetake }: ResultsViewProps) {
  const calComLink = process.env.NEXT_PUBLIC_CALCOM_LINK

  const categoryLabels = Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [Number(k), { name: v.name }]),
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <Badge variant="success" className="mb-3">
          <Bike className="mr-1 inline h-3 w-3" />
          Your match
        </Badge>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">{result.categoryName}</h1>
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">{result.categoryDescription}</p>
      </div>

      {/* Spectrum */}
      <Card>
        <SpectrumDisplay
          value={result.rawScore}
          categories={categoryLabels}
        />
      </Card>

      {/* Key specs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {result.travelRange && (
          <Card className="text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Travel Range</p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text)]">
              {result.travelRange.min}–{result.travelRange.max}mm
            </p>
          </Card>
        )}
        <Card className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Wheel Config</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{result.wheelConfig}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Frame Size</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{result.recommendedSize}</p>
        </Card>
      </div>

      {/* Budget & E-bike indicators */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">Budget: ${result.budget.toLocaleString()}</Badge>
        {result.ebike && <Badge variant="warning">E-Bike</Badge>}
      </div>

      {/* Why it matches */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Why this matches</h2>
        <ul className="flex flex-col gap-2">
          {result.whyMatches.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
              {reason}
            </li>
          ))}
        </ul>
      </Card>

      {/* Fit notes */}
      {result.fitNotes.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Fit notes</h2>
          <ul className="flex flex-col gap-2">
            {result.fitNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                {note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Also consider</h2>
          <div className="flex flex-col gap-3">
            {result.alternatives.map((alt) => (
              <div
                key={alt.categoryNumber}
                className="rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge>{alt.categoryName}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{alt.reason}</p>
              </div>
            ))}
          </div>
        </Card>
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
