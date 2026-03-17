'use client'

export type MapStyle = 'standard' | 'satellite' | 'terrain' | '3d' | '3d-satellite'

const STYLES: { id: MapStyle; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
  { id: '3d', label: '3D' },
  { id: '3d-satellite', label: '3D Sat' },
]

export const MAPBOX_STYLES: Record<MapStyle, string> = {
  standard: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
  '3d': 'mapbox://styles/mapbox/outdoors-v12',
  '3d-satellite': 'mapbox://styles/mapbox/satellite-streets-v12',
}

interface MapStyleSelectorProps {
  current: MapStyle
  onChange: (style: MapStyle) => void
}

export function MapStyleSelector({ current, onChange }: MapStyleSelectorProps) {
  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1 rounded-lg bg-[var(--color-surface)] p-1 shadow">
      {STYLES.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            current === s.id
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
