'use client'

import type { ListingCategory } from '@/modules/marketplace/types'

// Which categories should show each spec
const BIKE_CATEGORIES: ListingCategory[] = ['complete_bike']
const FRAME_CATEGORIES: ListingCategory[] = ['complete_bike', 'frame']
const WHEEL_CATEGORIES: ListingCategory[] = ['complete_bike', 'frame', 'fork', 'wheels', 'tires']
const FORK_TRAVEL_CATEGORIES: ListingCategory[] = ['complete_bike', 'fork']
const REAR_TRAVEL_CATEGORIES: ListingCategory[] = ['complete_bike', 'shock']
const MATERIAL_CATEGORIES: ListingCategory[] = ['complete_bike', 'frame', 'fork', 'cockpit']

const FRAME_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
const WHEEL_SIZES = ['26"', '27.5"', '27.5+"', '29"', '29+"', '700c', 'Other']
const MATERIALS = ['Carbon', 'Aluminum', 'Steel', 'Titanium', 'Carbon/Aluminum', 'Other']
const TRAVEL_OPTIONS = [80, 100, 110, 120, 130, 140, 150, 160, 170, 180, 200]

type Props = {
  category: string
  frameSize: string
  wheelSize: string
  forkTravel: string
  rearTravel: string
  frameMaterial: string
  onFrameSizeChange: (v: string) => void
  onWheelSizeChange: (v: string) => void
  onForkTravelChange: (v: string) => void
  onRearTravelChange: (v: string) => void
  onFrameMaterialChange: (v: string) => void
  inputClass: string
}

export function ListingSpecsSection({
  category,
  frameSize,
  wheelSize,
  forkTravel,
  rearTravel,
  frameMaterial,
  onFrameSizeChange,
  onWheelSizeChange,
  onForkTravelChange,
  onRearTravelChange,
  onFrameMaterialChange,
  inputClass,
}: Props) {
  const cat = category as ListingCategory

  const showFrameSize = FRAME_CATEGORIES.includes(cat)
  const showWheelSize = WHEEL_CATEGORIES.includes(cat)
  const showForkTravel = FORK_TRAVEL_CATEGORIES.includes(cat)
  const showRearTravel = REAR_TRAVEL_CATEGORIES.includes(cat)
  const showMaterial = MATERIAL_CATEGORIES.includes(cat)
  const showBikeInfo = BIKE_CATEGORIES.includes(cat)

  const hasAnySpec =
    showFrameSize || showWheelSize || showForkTravel || showRearTravel || showMaterial

  if (!hasAnySpec) return null

  const selectClass =
    'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]'

  const labelClass = 'text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Specs
      </h3>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {showFrameSize && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Frame Size</label>
            <select
              value={frameSize}
              onChange={(e) => onFrameSizeChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {FRAME_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {showWheelSize && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Wheel Size</label>
            <select
              value={wheelSize}
              onChange={(e) => onWheelSizeChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {WHEEL_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {showMaterial && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Material</label>
            <select
              value={frameMaterial}
              onChange={(e) => onFrameMaterialChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {showForkTravel && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fork Travel</label>
            <select
              value={forkTravel}
              onChange={(e) => onForkTravelChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {TRAVEL_OPTIONS.map((mm) => (
                <option key={mm} value={mm}>{mm}mm</option>
              ))}
            </select>
          </div>
        )}

        {showRearTravel && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>{showBikeInfo ? 'Rear Travel' : 'Travel'}</label>
            <select
              value={rearTravel}
              onChange={(e) => onRearTravelChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {TRAVEL_OPTIONS.map((mm) => (
                <option key={mm} value={mm}>{mm}mm</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  )
}
