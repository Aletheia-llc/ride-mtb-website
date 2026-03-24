'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CostSummaryCardProps {
  purchasePriceDollars: number
  componentCostDollars: number
  componentCount: number
  categoryBreakdown: { category: string; totalDollars: number }[]
}

export function CostSummaryCard({
  purchasePriceDollars,
  componentCostDollars,
  componentCount,
  categoryBreakdown,
}: CostSummaryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const total = purchasePriceDollars + componentCostDollars

  if (total === 0) return null

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Cost Summary</h2>

      <div className="space-y-2">
        {purchasePriceDollars > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Purchase price</span>
            <span className="font-medium text-[var(--color-text)]">
              ${purchasePriceDollars.toLocaleString()}
            </span>
          </div>
        )}
        {componentCostDollars > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">
              Components ({componentCount})
            </span>
            <span className="font-medium text-[var(--color-text)]">
              ${Math.round(componentCostDollars).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-semibold">
          <span className="text-[var(--color-text)]">Total</span>
          <span className="text-[var(--color-primary)]">
            ${Math.round(total).toLocaleString()}
          </span>
        </div>
      </div>

      {categoryBreakdown.some(c => c.totalDollars > 0) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Show'} breakdown
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-[var(--color-bg)] px-3 py-2">
          {categoryBreakdown
            .filter(c => c.totalDollars > 0)
            .sort((a, b) => b.totalDollars - a.totalDollars)
            .map(({ category, totalDollars }) => (
              <div key={category} className="flex justify-between text-xs">
                <span className="capitalize text-[var(--color-text-muted)]">
                  {category.toLowerCase()}
                </span>
                <span className="text-[var(--color-text)]">
                  ${Math.round(totalDollars).toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
