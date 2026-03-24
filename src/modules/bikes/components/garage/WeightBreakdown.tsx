'use client'

import { useState } from 'react'

type Unit = 'g' | 'lbs' | 'oz'

interface WeightBreakdownProps {
  categoryWeights: { category: string; weightGrams: number }[]
  totalWeightGrams: number
}

function convertWeight(grams: number, unit: Unit): string {
  if (unit === 'lbs') return (grams / 453.592).toFixed(2)
  if (unit === 'oz') return (grams / 28.3495).toFixed(1)
  return grams.toString()
}

export function WeightBreakdown({ categoryWeights, totalWeightGrams }: WeightBreakdownProps) {
  const [unit, setUnit] = useState<Unit>('g')

  if (categoryWeights.length === 0) return null

  const sorted = [...categoryWeights].sort((a, b) => b.weightGrams - a.weightGrams)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Component Weight</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Total:{' '}
            <strong className="text-[var(--color-text)]">
              {convertWeight(totalWeightGrams, unit)}{unit}
            </strong>
          </p>
        </div>
        <div className="flex gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5">
          {(['g', 'lbs', 'oz'] as Unit[]).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={[
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                unit === u
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {sorted.map(({ category, weightGrams }) => (
          <div key={category}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="capitalize text-[var(--color-text-muted)]">
                {category.toLowerCase()}
              </span>
              <span className="font-medium text-[var(--color-text)]">
                {convertWeight(weightGrams, unit)}{unit}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${Math.round((weightGrams / totalWeightGrams) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
