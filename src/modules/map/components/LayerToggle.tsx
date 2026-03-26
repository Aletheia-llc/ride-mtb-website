'use client'

import type { LayerName } from '../types'

const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
  skateparks: '#f97316',
  pumptracks: '#14b8a6',
  bikeparks: '#8b5cf6',
}

const LAYER_LABELS: Record<LayerName, string> = {
  trails: 'Trails',
  events: 'Events',
  coaching: 'Coaching',
  skateparks: 'Skateparks',
  pumptracks: 'Pump Tracks',
  bikeparks: 'Bike Parks',
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
      <div className="flex flex-col gap-1.5">
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
              style={
                active
                  ? { backgroundColor: color, borderColor: color, color: '#fff' }
                  : { borderColor: color, color: '#9ca3af' }
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity"
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: active ? '#fff' : color }}
              />
              <span style={active ? {} : { textDecoration: 'line-through' }}>
                {LAYER_LABELS[layer]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
