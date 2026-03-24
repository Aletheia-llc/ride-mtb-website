'use client'

type PricingSectionProps = {
  price: string
  onPriceChange: (v: string) => void
  acceptsOffers: boolean
  onAcceptsOffersChange: (v: boolean) => void
  minOfferPercent: string
  onMinOfferPercentChange: (v: string) => void
}

export function PricingSection({
  price,
  onPriceChange,
  acceptsOffers,
  onAcceptsOffersChange,
  minOfferPercent,
  onMinOfferPercentChange,
}: PricingSectionProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Section heading */}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Pricing
      </h3>

      {/* Price input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="listing-price"
          className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
        >
          Asking Price <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-text-muted)]">
            $
          </span>
          <input
            id="listing-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-7 pr-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Accept offers toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--color-text)]">Accept offers</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            Let buyers send you offers below the asking price
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={acceptsOffers}
          onClick={() => onAcceptsOffersChange(!acceptsOffers)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
            acceptsOffers ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              acceptsOffers ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Min offer percent (conditional) */}
      {acceptsOffers && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <label
            htmlFor="listing-min-offer"
            className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            Minimum Offer Threshold
          </label>
          <p className="text-xs text-[var(--color-text-muted)]">
            Auto-decline offers below this percentage of your asking price
          </p>
          <div className="relative mt-1 w-32">
            <input
              id="listing-min-offer"
              type="number"
              min="1"
              max="99"
              step="1"
              placeholder="70"
              value={minOfferPercent}
              onChange={(e) => onMinOfferPercentChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-3 pr-8 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-text-muted)]">
              %
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
