'use client'

import type { LayerName } from '../types'

const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
  skateparks: '#f97316',
  pumptracks: '#14b8a6',
  bikeparks: '#8b5cf6',
  bikeshops: '#ec4899',
  campgrounds: '#78716c',
}

const LAYER_LABELS: Record<LayerName, string> = {
  trails: 'Trails',
  events: 'Events',
  coaching: 'Coaching',
  skateparks: 'Skateparks',
  pumptracks: 'Pump Tracks',
  bikeparks: 'Bike Parks',
  bikeshops: 'Bike Shops',
  campgrounds: 'Campgrounds',
}

interface LayerToggleProps {
  availableLayers: LayerName[]
  activeLayers: Set<LayerName>
  onToggle: (layer: LayerName) => void
}

export function LayerToggle({ availableLayers, activeLayers, onToggle }: LayerToggleProps) {
  return (
    <div className="absolute left-2 top-24 z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-md">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Layers
      </p>
      <div className="flex flex-col gap-0.5">
        {availableLayers.map((layer) => {
          const active = activeLayers.has(layer)
          const color = LAYER_COLORS[layer]
          return (
            <button
              key={layer}
              type="button"
              aria-pressed={active}
              aria-label={`${LAYER_LABELS[layer]} layer (${active ? 'on' : 'off'})`}
              onClick={() => onToggle(layer)}
              className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              {/* Checkbox */}
              <span
                className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm transition-colors"
                style={
                  active
                    ? { backgroundColor: color, border: `2px solid ${color}` }
                    : { backgroundColor: 'transparent', border: '2px solid #6b7280' }
                }
              >
                {active && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {/* Colored dot */}
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {/* Label */}
              <span
                className="text-left"
                style={{ color: active ? 'var(--color-text)' : 'var(--color-text-muted)' }}
              >
                {LAYER_LABELS[layer]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
