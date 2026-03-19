'use client'

import type { FulfillmentType } from '@/modules/marketplace/types'
import { PackageDimensions } from '@/modules/marketplace/components/shipping/PackageDimensions'

const FULFILLMENT_OPTIONS: {
  value: FulfillmentType
  label: string
}[] = [
  { value: 'local_only', label: 'Local Pickup' },
  { value: 'ship_only', label: 'Ship' },
  { value: 'local_or_ship', label: 'Both' },
]

type FulfillmentSectionProps = {
  fulfillment: string
  onFulfillmentChange: (v: string) => void
  shippingCost: string
  onShippingCostChange: (v: string) => void
  estimatedWeight: string
  onEstimatedWeightChange: (v: string) => void
  packageLength: string
  onPackageLengthChange: (v: string) => void
  packageWidth: string
  onPackageWidthChange: (v: string) => void
  packageHeight: string
  onPackageHeightChange: (v: string) => void
  city: string
  onCityChange: (v: string) => void
  state: string
  onStateChange: (v: string) => void
  zipCode: string
  onZipCodeChange: (v: string) => void
}

export function FulfillmentSection({
  fulfillment,
  onFulfillmentChange,
  shippingCost,
  onShippingCostChange,
  estimatedWeight,
  onEstimatedWeightChange,
  packageLength,
  onPackageLengthChange,
  packageWidth,
  onPackageWidthChange,
  packageHeight,
  onPackageHeightChange,
  city,
  onCityChange,
  state,
  onStateChange,
  zipCode,
  onZipCodeChange,
}: FulfillmentSectionProps) {
  const showLocal =
    fulfillment === 'local_only' || fulfillment === 'local_or_ship'
  const showShipping =
    fulfillment === 'ship_only' || fulfillment === 'local_or_ship'

  return (
    <div className="flex flex-col gap-5">
      {/* Section heading */}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Fulfillment
      </h3>

      {/* Fulfillment type radio buttons */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          How will you deliver this item? <span className="text-red-500">*</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {FULFILLMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFulfillmentChange(opt.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                fulfillment === opt.value
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Local pickup fields */}
      {showLocal && (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Pickup Location
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* City */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="listing-city"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                City
              </label>
              <input
                id="listing-city"
                type="text"
                placeholder="Denver"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </div>

            {/* State */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="listing-state"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                State
              </label>
              <input
                id="listing-state"
                type="text"
                placeholder="CO"
                maxLength={2}
                value={state}
                onChange={(e) => onStateChange(e.target.value.toUpperCase())}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm uppercase text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </div>

            {/* Zip Code */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="listing-zip"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                ZIP Code
              </label>
              <input
                id="listing-zip"
                type="text"
                placeholder="80202"
                maxLength={5}
                inputMode="numeric"
                pattern="[0-9]{5}"
                value={zipCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 5)
                  onZipCodeChange(digits)
                }}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Shipping fields */}
      {showShipping && (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Shipping Details
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Shipping cost */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="listing-shipping-cost"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                Flat Shipping Cost
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-text-muted)]">
                  $
                </span>
                <input
                  id="listing-shipping-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={shippingCost}
                  onChange={(e) => onShippingCostChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-7 pr-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Estimated weight */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="listing-weight"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                Estimated Weight
              </label>
              <div className="relative">
                <input
                  id="listing-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={estimatedWeight}
                  onChange={(e) => onEstimatedWeightChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-3 pr-10 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-text-muted)]">
                  lbs
                </span>
              </div>
            </div>
          </div>

          {/* Package dimensions */}
          <div className="mt-1 border-t border-[var(--color-border)] pt-4">
            <PackageDimensions
              weight={estimatedWeight}
              onWeightChange={onEstimatedWeightChange}
              length={packageLength}
              onLengthChange={onPackageLengthChange}
              width={packageWidth}
              onWidthChange={onPackageWidthChange}
              height={packageHeight}
              onHeightChange={onPackageHeightChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
