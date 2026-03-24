'use client'

import { Truck } from 'lucide-react'
import type { ShippingRate } from '@/modules/marketplace/types'

type ShippingMethodSelectProps = {
  rates: ShippingRate[]
  selectedId: string | null
  onSelect: (rate: ShippingRate) => void
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDays(days: number): string {
  if (days === 1) return '1 business day'
  return `${days} business days`
}

export function ShippingMethodSelect({
  rates,
  selectedId,
  onSelect,
}: ShippingMethodSelectProps) {
  if (rates.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center text-sm text-[var(--color-text-muted)]">
        No shipping options available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-[var(--color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Shipping Method</h3>
      </div>

      <div className="flex flex-col gap-2">
        {rates.map((rate) => {
          const isSelected = selectedId === rate.id

          return (
            <label
              key={rate.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              {/* Radio */}
              <input
                type="radio"
                name="shipping-method"
                value={rate.id}
                checked={isSelected}
                onChange={() => onSelect(rate)}
                className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              />

              {/* Details */}
              <div className="flex flex-1 items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {rate.carrier} {rate.service}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Est. {formatDays(rate.estimatedDays)}
                  </span>
                </div>

                {/* Price */}
                <span
                  className={`text-sm font-semibold ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}
                >
                  {formatPrice(rate.rate)}
                </span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
