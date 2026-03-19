'use client'

import { Package } from 'lucide-react'

type PackageDimensionsProps = {
  weight: string
  onWeightChange: (v: string) => void
  length: string
  onLengthChange: (v: string) => void
  width: string
  onWidthChange: (v: string) => void
  height: string
  onHeightChange: (v: string) => void
}

const numberInputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

export function PackageDimensions({
  weight,
  onWeightChange,
  length,
  onLengthChange,
  width,
  onWidthChange,
  height,
  onHeightChange,
}: PackageDimensionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Package Dimensions
        </span>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Enter package details for accurate shipping estimates, or set a flat
        shipping cost above.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Weight */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pkg-weight"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Weight
          </label>
          <div className="relative">
            <input
              id="pkg-weight"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              className={`${numberInputClass} pr-10`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)]">
              lbs
            </span>
          </div>
        </div>

        {/* Length */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pkg-length"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Length
          </label>
          <div className="relative">
            <input
              id="pkg-length"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              value={length}
              onChange={(e) => onLengthChange(e.target.value)}
              className={`${numberInputClass} pr-7`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)]">
              in
            </span>
          </div>
        </div>

        {/* Width */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pkg-width"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Width
          </label>
          <div className="relative">
            <input
              id="pkg-width"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              value={width}
              onChange={(e) => onWidthChange(e.target.value)}
              className={`${numberInputClass} pr-7`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)]">
              in
            </span>
          </div>
        </div>

        {/* Height */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pkg-height"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Height
          </label>
          <div className="relative">
            <input
              id="pkg-height"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              value={height}
              onChange={(e) => onHeightChange(e.target.value)}
              className={`${numberInputClass} pr-7`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)]">
              in
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
