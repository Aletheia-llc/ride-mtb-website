'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { ListingCategory } from '@/modules/marketplace/types'

/* ---------- options ---------- */

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

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

const FULFILLMENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'local_only', label: 'Local pickup only' },
  { value: 'ship_only', label: 'Shipping only' },
  { value: 'local_or_ship', label: 'Local or shipping' },
]

/* ---------- styles ---------- */

const selectClass =
  'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'

const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]'

/* ---------- component ---------- */

export function BrowseFilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get('category') ?? ''
  const currentSort = searchParams.get('sort') ?? 'newest'
  const currentConditions = searchParams.getAll('condition')
  const currentFulfillment = searchParams.get('fulfillment') ?? ''
  const currentMinPrice = searchParams.get('minPrice') ?? ''
  const currentMaxPrice = searchParams.get('maxPrice') ?? ''

  const hasFilters =
    currentCategory !== '' ||
    currentSort !== 'newest' ||
    currentConditions.length > 0 ||
    currentFulfillment !== '' ||
    currentMinPrice !== '' ||
    currentMaxPrice !== ''

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString()
      router.push(qs ? `/buy-sell?${qs}` : '/buy-sell')
    },
    [router],
  )

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && !(key === 'sort' && value === 'newest')) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      pushParams(params)
    },
    [searchParams, pushParams],
  )

  const toggleCondition = useCallback(
    (condition: string) => {
      const params = new URLSearchParams(searchParams.toString())
      const existing = params.getAll('condition')
      params.delete('condition')
      if (existing.includes(condition)) {
        existing.filter((c) => c !== condition).forEach((c) => params.append('condition', c))
      } else {
        [...existing, condition].forEach((c) => params.append('condition', c))
      }
      pushParams(params)
    },
    [searchParams, pushParams],
  )

  const clearAll = useCallback(() => {
    router.push('/buy-sell')
  }, [router])

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-56">
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

      {/* Condition */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Condition</span>
        <div className="flex flex-col gap-1.5">
          {CONDITION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]"
            >
              <input
                type="checkbox"
                checked={currentConditions.includes(opt.value)}
                onChange={() => toggleCondition(opt.value)}
                className="h-3.5 w-3.5 rounded accent-[var(--color-primary)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Price</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={currentMinPrice}
            onChange={(e) => updateParam('minPrice', e.target.value)}
            className={inputClass}
          />
          <span className="text-xs text-[var(--color-dim)]">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={currentMaxPrice}
            onChange={(e) => updateParam('maxPrice', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Fulfillment */}
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Shipping</span>
        <div className="flex flex-col gap-1.5">
          {FULFILLMENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]"
            >
              <input
                type="radio"
                name="fulfillment"
                value={opt.value}
                checked={currentFulfillment === opt.value}
                onChange={() => updateParam('fulfillment', opt.value)}
                className="h-3.5 w-3.5 accent-[var(--color-primary)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
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
