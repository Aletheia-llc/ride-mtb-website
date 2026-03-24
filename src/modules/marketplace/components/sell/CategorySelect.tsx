'use client'

import type { ListingCategory } from '@/modules/marketplace/types'

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

type CategorySelectProps = {
  value: string
  onChange: (value: string) => void
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="listing-category"
        className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
      >
        Category <span className="text-red-500">*</span>
      </label>
      <select
        id="listing-category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
      >
        <option value="" disabled>
          Select a category...
        </option>
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
