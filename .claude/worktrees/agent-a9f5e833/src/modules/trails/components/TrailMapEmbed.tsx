'use client'

import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { GpsPoint } from '../types'

interface TrailMapEmbedProps {
  trackData: string // JSON string of GpsPoint[]
  className?: string
}

function parseTrackToCoords(trackData: string): [number, number][] {
  try {
    const points: GpsPoint[] = JSON.parse(trackData)
    return points.map(([lat, lng]) => [lng, lat])
  } catch {
    return []
  }
}

/**
 * Lightweight, non-interactive map embed for displaying a single trail.
 * Useful for cross-module composition (e.g., forum thread about a trail).
 */
export function TrailMapEmbed({ trackData, className = '' }: TrailMapEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error('TrailMapEmbed: NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      return
    }

    const coords = parseTrackToCoords(trackData)
    if (coords.length < 2) return

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      interactive: false,
      attributionControl: false,
    })

    map.on('load', () => {
      // Add trail line
      map.addSource('trail-embed', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      })

      map.addLayer({
        id: 'trail-embed-line',
        type: 'line',
        source: 'trail-embed',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#16a34a',
          'line-width': 3,
        },
      })

      // Fit bounds to trail
      const bounds = new mapboxgl.LngLatBounds()
      for (const coord of coords) {
        bounds.extend(coord as [number, number])
      }
      map.fitBounds(bounds, { padding: 30, duration: 0 })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [trackData])

  return (
    <div
      ref={containerRef}
      className={`h-[200px] w-full rounded-lg ${className}`}
    />
  )
}
