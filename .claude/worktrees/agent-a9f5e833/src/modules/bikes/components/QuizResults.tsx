'use client'

import { useState } from 'react'
import { RotateCcw, Share2, Calendar, Bike } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/ui/components'
import { Card } from '@/ui/components'
import type { SpectrumResult } from '../types'
import { CATEGORY_META } from '../lib/constants'
import { SpectrumDisplay } from './SpectrumDisplay'
import { ScoreBreakdown } from './ScoreBreakdown'
import { BrandLinks } from './BrandLinks'
import { ConsultationModal } from './ConsultationModal'

interface QuizResultsProps {
  result: SpectrumResult
  resultId?: string
  quizSessionId?: string
}

export function QuizResults({ result, resultId, quizSessionId }: QuizResultsProps) {
  const [consultationOpen, setConsultationOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const categoryLabels = Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [Number(k), { name: v.name }]),
  )

  function handleShare() {
    const url = resultId
      ? `${window.location.origin}/bikes/selector/results/${resultId}`
      : window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        setCopyFailed(true)
        setTimeout(() => setCopyFailed(false), 2000)
      })
    } else {
      window.prompt('Copy this link to share your result:', url)
    }
  }

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

      {/* Brand links */}
      <BrandLinks
        categoryNumber={result.primaryCategory}
        budget={result.budget}
        ebike={result.ebike}
      />

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
        <Link
          href="/bikes/selector"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]"
        >
          <RotateCcw className="h-4 w-4" />
          Retake quiz
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]"
        >
          <Share2 className="h-4 w-4" />
          {copied ? 'Copied!' : copyFailed ? 'Copy failed' : 'Share result'}
        </button>
        <button
          type="button"
          onClick={() => setConsultationOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Calendar className="h-4 w-4" />
          Book consultation
        </button>
      </div>

      <ConsultationModal
        open={consultationOpen}
        onClose={() => setConsultationOpen(false)}
        quizSessionId={quizSessionId}
        budget={result.budget}
      />
    </div>
  )
}
