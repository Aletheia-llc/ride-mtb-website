'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, SlidersHorizontal, X } from 'lucide-react'
import type { BikeListing } from '../lib/bike-listings'
import { CATEGORY_META } from '../lib/constants'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/category-colors'

export { CATEGORY_COLORS } from '../lib/category-colors'

const BUDGET_BUCKETS = [
  { label: 'Under $2k', min: 0, max: 1999 },
  { label: '$2k–$4k', min: 2000, max: 3999 },
  { label: '$4k–$6k', min: 4000, max: 5999 },
  { label: '$6k+', min: 6000, max: Infinity },
]

interface BikeBrowserProps {
  bikes: BikeListing[]
  categoryNum?: number
}

export function BikeBrowser({ bikes, categoryNum }: BikeBrowserProps) {
  const meta = categoryNum ? CATEGORY_META[categoryNum] : null
  const brands = useMemo(() => [...new Set(bikes.map((b) => b.brand))].sort(), [bikes])

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedBudgets, setSelectedBudgets] = useState<number[]>([])
  const [selectedFrame, setSelectedFrame] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  function toggleBrand(brand: string) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  function toggleBudget(idx: number) {
    setSelectedBudgets((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  function toggleFrame(frame: string) {
    setSelectedFrame((prev) =>
      prev.includes(frame) ? prev.filter((f) => f !== frame) : [...prev, frame]
    )
  }

  function clearFilters() {
    setSelectedBrands([])
    setSelectedBudgets([])
    setSelectedFrame([])
  }

  const filtered = useMemo(() => {
    return bikes.filter((bike) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(bike.brand)) return false
      if (selectedFrame.length > 0 && !selectedFrame.includes(bike.frame)) return false
      if (selectedBudgets.length > 0) {
        const inBudget = selectedBudgets.some((idx) => {
          const bucket = BUDGET_BUCKETS[idx]
          return bike.price >= bucket.min && bike.price <= bucket.max
        })
        if (!inBudget) return false
      }
      return true
    })
  }, [bikes, selectedBrands, selectedFrame, selectedBudgets])

  const activeFilterCount = selectedBrands.length + selectedBudgets.length + selectedFrame.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          {filtered.length} of {bikes.length} bikes
          {meta?.travelRange && (
            <span className="ml-2 text-[var(--color-primary)]">
              · {meta.travelRange.min}–{meta.travelRange.max}mm travel
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Brand</p>
              <div className="flex flex-col gap-1.5">
                {brands.map((brand) => (
                  <label key={brand} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Budget</p>
              <div className="flex flex-col gap-1.5">
                {BUDGET_BUCKETS.map((bucket, idx) => (
                  <label key={bucket.label} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBudgets.includes(idx)}
                      onChange={() => toggleBudget(idx)}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">{bucket.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Frame */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Frame</p>
              <div className="flex flex-col gap-1.5">
                {(['Alloy', 'Carbon'] as const).map((frame) => (
                  <label key={frame} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFrame.includes(frame)}
                      onChange={() => toggleFrame(frame)}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">{frame}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Bike grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] py-16 text-center">
          <p className="text-[var(--color-text-muted)]">No bikes match your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm text-[var(--color-primary)] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bike) => (
            <BikeCard key={bike.id} bike={bike} showCategory={!categoryNum} />
          ))}
        </div>
      )}
    </div>
  )
}

function BikeCard({ bike, showCategory }: { bike: BikeListing; showCategory?: boolean }) {
  const colors = CATEGORY_COLORS[bike.category]
  const label = CATEGORY_LABELS[bike.category]

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border bg-[var(--color-bg)] transition-shadow hover:shadow-md"
      style={{ borderColor: colors.border, borderTopWidth: 3 }}
    >
      {/* Specs strip */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
        {bike.travel !== null && (
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Travel</span>
            <span className="text-xs font-semibold text-[var(--color-text)]">{bike.travel}mm</span>
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Wheels</span>
          <span className="text-xs font-semibold text-[var(--color-text)]">{bike.wheelSize}&quot;</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Frame</span>
          <span className="text-xs font-semibold text-[var(--color-text)]">{bike.frame}</span>
        </div>
        {/* Travel bar */}
        <div className="ml-auto flex flex-col items-end gap-1">
          {showCategory && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: colors.bg, color: colors.text }}
            >
              {label}
            </span>
          )}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              {bike.travel !== null ? `${bike.travel}mm` : 'Rigid'}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(3, ((bike.travel ?? 0) / 215) * 100)}%`,
                  background: colors.tab,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{bike.brand}</p>
          <h3 className="text-base font-bold text-[var(--color-text)]">{bike.model}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{bike.description}</p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-[var(--color-text)]">
            ${bike.price.toLocaleString()}
          </span>
          <a
            href={bike.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: colors.tab }}
          >
            Shop {bike.brand.split(' ')[0]}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
