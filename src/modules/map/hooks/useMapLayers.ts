'use client'

import { useState, useCallback } from 'react'
import type { LayerName } from '../types'

const STORAGE_KEY = 'ride-mtb-map-layers'

export function useMapLayers(
  defaultLayers: LayerName[],
  availableLayers: LayerName[]
) {
  const [activeLayers, setActiveLayers] = useState<Set<LayerName>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as LayerName[]
        const valid = parsed.filter((l) => availableLayers.includes(l))
        if (valid.length > 0) return new Set(valid)
      }
    } catch {}
    return new Set(defaultLayers)
  })

  const toggleLayer = useCallback((layer: LayerName) => {
    setActiveLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) {
        next.delete(layer)
      } else {
        next.add(layer)
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  return { activeLayers, toggleLayer }
}
