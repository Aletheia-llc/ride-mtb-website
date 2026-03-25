'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { ListingCategory } from '@/modules/marketplace/types'

/* ---------- category options ---------- */

const CATEGORY_OPTIONS: { value: ListingCategory; label: string }[] = [
  { value: 'complete_bike', label: 'Complete Bikes' },
  { value: 'frame', label: 'Frames' },
  { value: 'fork', label: 'Forks' },
  { value: 'shock', label: 'Shocks' },
  { value: 'wheels', label: 'Wheels' },
  { value: 'tires', label: 'Tires' },
  { value: 'drivetrain', label: 'Drivetrain' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'cockpit', label: 'Cockpit' },
  { value: 'saddle_seatpost', label: 'Saddle & Seatpost' },
  { value: 'pedals', label: 'Pedals' },
  { value: 'dropper_post', label: 'Dropper Posts' },
  { value: 'helmet', label: 'Helmets' },
  { value: 'goggles_eyewear', label: 'Goggles & Eyewear' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'pack_hydration', label: 'Packs & Hydration' },
  { value: 'tools', label: 'Tools' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'protection', label: 'Protection' },
  { value: 'rack_transport', label: 'Racks & Transport' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'other', label: 'Other' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'most_saved', label: 'Most Saved' },
] as const

const selectClass =
  'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'

/* ---------- component ---------- */

export function BrowseFilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get('category') ?? ''
  const currentSort = searchParams.get('sort') ?? 'newest'
  const hasFilters = currentCategory !== '' || currentSort !== 'newest'

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'newest' && key === 'sort') {
        params.set(key, value)
      } else if (value && key !== 'sort') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const qs = params.toString()
      router.push(qs ? `/buy-sell?${qs}` : '/buy-sell')
    },
    [router, searchParams],
  )

  const clearAll = useCallback(() => {
    router.push('/buy-sell')
  }, [router])

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-56">
      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-category" className={labelClass}>
          Category
        </label>
        <select
          id="filter-category"
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
          className={selectClass}
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-sort" className={labelClass}>
          Sort By
        </label>
        <select
          id="filter-sort"
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className={selectClass}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
        >
          Clear all filters
        </button>
      )}
    </aside>
  )
}
