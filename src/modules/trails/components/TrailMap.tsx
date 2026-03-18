'use client'

import { useRef, useEffect, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { GpsPoint } from '../types'

interface TrailMapProps {
  center?: [number, number] // [lng, lat]
  zoom?: number
  trails?: Array<{
    id: string
    name: string
    slug: string
    trackData: string // JSON string of GpsPoint[]
    difficulty?: number
  }>
  selectedTrailId?: string | null
  onTrailClick?: (slug: string) => void
  className?: string
  trailheadLat?: number | null
  trailheadLng?: number | null
}

const DEFAULT_CENTER: [number, number] = [-109.55, 38.58]
const DEFAULT_ZOOM = 10

function difficultyColor(level: number | undefined): string {
  if (level == null) return '#3b82f6'
  if (level <= 2) return '#22c55e'
  if (level === 3) return '#3b82f6'
  if (level === 4) return '#f59e0b'
  return '#ef4444'
}

/**
 * Parse track data JSON and convert [lat, lng, ele] → GeoJSON [lng, lat] coords.
 */
function parseTrackToCoords(trackData: string): [number, number][] {
  try {
    const points: GpsPoint[] = JSON.parse(trackData)
    return points.map(([lat, lng]) => [lng, lat])
  } catch {
    return []
  }
}

export function TrailMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  trails = [],
  selectedTrailId = null,
  onTrailClick,
  className = '',
  trailheadLat,
  trailheadLng,
}: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const prevTrailIdsRef = useRef<string[]>([])
  const trailheadMarkerRef = useRef<mapboxgl.Marker | null>(null)

  // Store callback in ref so map event handlers always see latest
  const onTrailClickRef = useRef(onTrailClick)
  onTrailClickRef.current = onTrailClick

  const addTrailLayers = useCallback(
    (map: mapboxgl.Map) => {
      // Remove layers/sources added in the previous render pass
      for (const sourceId of prevTrailIdsRef.current) {
        if (map.getLayer(`${sourceId}-line`)) {
          map.removeLayer(`${sourceId}-line`)
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId)
        }
      }

      const newIds: string[] = []

      for (const trail of trails) {
        const coords = parseTrackToCoords(trail.trackData)
        if (coords.length < 2) continue

        const sourceId = `trail-${trail.id}`
        const layerId = `${sourceId}-line`
        const isSelected = trail.id === selectedTrailId

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              id: trail.id,
              name: trail.name,
              slug: trail.slug,
            },
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          },
        })

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': difficultyColor(trail.difficulty),
            'line-width': isSelected ? 5 : 3,
            'line-opacity': isSelected ? 1 : 0.8,
          },
        })

        // Click handler
        map.on('click', layerId, () => {
          onTrailClickRef.current?.(trail.slug)
        })

        // Hover handlers
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
          hoveredIdRef.current = trail.id
          map.setPaintProperty(layerId, 'line-width', 5)
        })

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
          hoveredIdRef.current = null
          const restore = trail.id === selectedTrailId ? 5 : 3
          map.setPaintProperty(layerId, 'line-width', restore)
        })

        newIds.push(sourceId)
      }

      // Record IDs for cleanup on the next call
      prevTrailIdsRef.current = newIds
    },
    [trails, selectedTrailId],
  )

  useEffect(() => {
    if (!containerRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error('TrailMap: NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      return
    }

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right')

    map.on('load', () => {
      addTrailLayers(map)
    })

    if (trailheadLat != null && trailheadLng != null) {
      const el = document.createElement('div')
      el.className = 'trailhead-marker'
      el.style.cssText = 'width:16px;height:16px;background:#16a34a;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer'
      trailheadMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([trailheadLng, trailheadLat])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML('<div style="font-size:12px;font-weight:600;padding:2px 0;">Trailhead</div>'))
        .addTo(map)
    }

    mapRef.current = map

    return () => {
      trailheadMarkerRef.current?.remove()
      trailheadMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Initialize once

  // Update trail layers when trails or selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    addTrailLayers(map)
  }, [addTrailLayers])

  // Update trailhead marker when coords change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    if (trailheadMarkerRef.current) {
      trailheadMarkerRef.current.remove()
      trailheadMarkerRef.current = null
    }

    if (trailheadLat != null && trailheadLng != null) {
      const el = document.createElement('div')
      el.style.cssText = 'width:16px;height:16px;background:#16a34a;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer'
      trailheadMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([trailheadLng, trailheadLat])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML('<div style="font-size:12px;font-weight:600;padding:2px 0;">Trailhead</div>'))
        .addTo(map)
    }
  }, [trailheadLat, trailheadLng])

  return (
    <div
      ref={containerRef}
      className={`h-96 w-full rounded-xl ${className}`}
    />
  )
}
