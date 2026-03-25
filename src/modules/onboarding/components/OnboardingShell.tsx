'use client'

import React from 'react'

interface OnboardingShellProps {
  step: number
  totalSteps: number
  /** Skip this individual step and advance */
  onSkip?: () => void
  /** Abandon the whole setup flow */
  onSkipSetup: () => void
  /** Go back to the previous step — undefined on step 1 */
  onBack?: () => void
  children: React.ReactNode
}

export default function OnboardingShell({
  step,
  totalSteps,
  onSkip,
  onSkipSetup,
  onBack,
  children,
}: OnboardingShellProps) {
  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 sm:py-16">
      {/* ── Header row: back arrow + step counter + skip-setup ── */}
      <div className="flex items-center justify-between mb-5">
        {/* Back button (or empty spacer on step 1) */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            {/* Chevron left */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        ) : (
          <span className="w-12" />
        )}

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5" aria-label={`Step ${step} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i + 1 === step ? '20px' : '6px',
                height: '6px',
                backgroundColor:
                  i + 1 <= step
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
              }}
            />
          ))}
        </div>

        {/* Skip entire setup */}
        <button
          type="button"
          onClick={onSkipSetup}
          className="text-sm transition-colors"
          style={{ color: 'var(--color-dim)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-dim)' }}
        >
          Skip all
        </button>
      </div>

      {/* ── Card ── */}
      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {children}

        {/* Skip this step — only shown when an onSkip handler is provided */}
        {onSkip && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm transition-colors"
              style={{ color: 'var(--color-dim)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-dim)' }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>

      {/* Step counter text below card */}
      <p
        className="mt-4 text-center text-xs"
        style={{ color: 'var(--color-dim)' }}
      >
        Step {step} of {totalSteps}
      </p>
    </div>
  )
}
