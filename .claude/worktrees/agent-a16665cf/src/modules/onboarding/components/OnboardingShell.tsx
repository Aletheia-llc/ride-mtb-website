'use client'

import React from 'react'

interface OnboardingShellProps {
  step: number
  totalSteps: number
  onSkip: () => void
  onSkipSetup: () => void
  children: React.ReactNode
}

export default function OnboardingShell({
  step,
  totalSteps,
  onSkip,
  onSkipSetup,
  children,
}: OnboardingShellProps) {
  const progress = (step / totalSteps) * 100

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      {/* Progress bar */}
      <div
        className="w-full h-1.5 rounded-full mb-6"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--color-primary)',
          }}
        />
      </div>

      {/* Step counter + skip setup */}
      <div className="flex items-center justify-between mb-8">
        <span
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Step {step} of {totalSteps}
        </span>
        <button
          type="button"
          onClick={onSkipSetup}
          className="text-sm underline transition-colors"
          style={{ color: 'var(--color-dim)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-dim)'
          }}
        >
          Skip setup
        </button>
      </div>

      {/* Step content */}
      {children}

      {/* Skip this step */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm transition-colors"
          style={{ color: 'var(--color-dim)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-dim)'
          }}
        >
          Skip this step
        </button>
      </div>
    </div>
  )
}
