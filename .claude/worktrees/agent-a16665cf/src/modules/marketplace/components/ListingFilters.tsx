'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/ui/components'
import {
  categoryLabels,
  conditionLabels,
} from '../types'
import type { ListingCategory, ItemCondition } from '../types'

const categories = Object.entries(categoryLabels) as [ListingCategory, string][]
const conditions = Object.entries(conditionLabels) as [ItemCondition, string][]

export function ListingFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get('category') ?? ''
  const activeCondition = searchParams.get('condition') ?? ''
  const activeMinPrice = searchParams.get('minPrice') ?? ''
  const activeMaxPrice = searchParams.get('maxPrice') ?? ''
  const activeSearch = searchParams.get('search') ?? ''

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }

      // Reset to page 1 on filter change
      params.delete('page')

      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Search listings..."
        defaultValue={activeSearch}
        onChange={(e) => {
          const timer = setTimeout(() => {
            updateParams({ search: e.target.value })
          }, 400)
          return () => clearTimeout(timer)
        }}
      />

      {/* Category pills */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParams({ category: '' })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !activeCategory
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </button>
          {categories.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                updateParams({
                  category: activeCategory === value ? '' : value,
                })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Condition + price row */}
      <div className="flex flex-wrap gap-4">
        {/* Condition select */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-condition"
            className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            Condition
          </label>
          <select
            id="filter-condition"
            value={activeCondition}
            onChange={(e) => updateParams({ condition: e.target.value })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">Any condition</option>
            {conditions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div className="flex items-end gap-2">
          <Input
            label="Min Price"
            type="number"
            placeholder="$0"
            min={0}
            step={1}
            defaultValue={activeMinPrice}
            onChange={(e) => {
              const timer = setTimeout(() => {
                updateParams({ minPrice: e.target.value })
              }, 400)
              return () => clearTimeout(timer)
            }}
            className="w-28"
          />
          <span className="mb-2 text-[var(--color-text-muted)]">-</span>
          <Input
            label="Max Price"
            type="number"
            placeholder="Any"
            min={0}
            step={1}
            defaultValue={activeMaxPrice}
            onChange={(e) => {
              const timer = setTimeout(() => {
                updateParams({ maxPrice: e.target.value })
              }, 400)
              return () => clearTimeout(timer)
            }}
            className="w-28"
          />
        </div>
      </div>
    </div>
  )
}
