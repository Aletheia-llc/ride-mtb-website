'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ScoreBreakdown as ScoreBreakdownType } from '../types'

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const steps = [
    {
      label: 'Terrain base',
      inputs: breakdown.terrainInputs.join(', ') || 'none',
      value: breakdown.terrainBase,
    },
    {
      label: 'Ride day blend',
      inputs: breakdown.rideDayInput || 'none',
      value: breakdown.rideDayBlend,
    },
    {
      label: 'After priorities',
      inputs: breakdown.priorityInputs.join(', ') || 'none',
      value: breakdown.afterPriorities,
    },
    {
      label: 'Pedaling modifier',
      inputs: `enjoyment: ${breakdown.pedalingInput}/10`,
      value: breakdown.pedalingModifier,
      isModifier: true,
    },
    {
      label: 'Experience modifier',
      inputs: breakdown.experienceInput || 'none',
      value: breakdown.experienceModifier,
      isModifier: true,
    },
    {
      label: 'Raw score',
      inputs: '',
      value: breakdown.rawScore,
    },
    {
      label: 'Final category',
      inputs: '',
      value: breakdown.finalCategory,
      isFinal: true,
    },
  ]

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Score breakdown
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-[var(--color-border)] p-4">
          <div className="flex flex-col gap-3">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {/* Label + inputs */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`text-sm font-medium ${
                      step.isFinal ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.inputs && (
                    <span className="truncate text-xs text-[var(--color-text-muted)]">
                      {step.inputs}
                    </span>
                  )}
                </div>

                {/* Value */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      step.isFinal
                        ? 'text-[var(--color-primary)]'
                        : step.isModifier
                          ? step.value > 0
                            ? 'text-red-500'
                            : step.value < 0
                              ? 'text-green-600'
                              : 'text-[var(--color-text-muted)]'
                          : 'text-[var(--color-text)]'
                    }`}
                  >
                    {step.isModifier && step.value > 0 ? '+' : ''}
                    {step.value.toFixed(1)}
                  </span>

                  {/* Mini spectrum indicator */}
                  {!step.isModifier && (
                    <div className="relative h-1.5 w-16 rounded-full bg-[var(--color-border)]">
                      <div
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)]"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((step.value - 1) / 8) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
