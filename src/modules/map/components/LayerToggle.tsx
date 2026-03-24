'use client'

import type { LayerName } from '../types'

const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
}

const LAYER_LABELS: Record<LayerName, string> = {
  trails: 'Trails',
  events: 'Events',
  coaching: 'Coaching',
}

interface LayerToggleProps {
  availableLayers: LayerName[]
  activeLayers: Set<LayerName>
  onToggle: (layer: LayerName) => void
}

export function LayerToggle({ availableLayers, activeLayers, onToggle }: LayerToggleProps) {
  return (
    <div className="absolute left-2 top-24 z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-md">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Layers
      </p>
      <div className="space-y-1">
        {availableLayers.map((layer) => (
          <label key={layer} className="flex cursor-pointer items-center gap-2 text-sm">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: LAYER_COLORS[layer] }}
            />
            <input
              type="checkbox"
              checked={activeLayers.has(layer)}
              onChange={() => onToggle(layer)}
              className="sr-only"
            />
            <span className={activeLayers.has(layer) ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
              {LAYER_LABELS[layer]}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
