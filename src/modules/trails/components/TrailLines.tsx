'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { getDifficultyColor } from '../lib/difficulty'

interface TrailLineData {
  slug: string
  name: string
  physicalDifficulty?: number | null
  technicalDifficulty?: number | null
  distanceMiles?: number | null
  trackData: string // JSON: [[lat, lng, ele], ...]
}

interface TrailLinesProps {
  map: mapboxgl.Map | null
  trails: TrailLineData[]
  highlightSlug?: string | null
  onTrailClick?: (slug: string) => void
  colorMode?: 'difficulty' | 'elevation'
}

export type { TrailLineData }

export function TrailLines({ map, trails, highlightSlug, onTrailClick, colorMode = 'difficulty' }: TrailLinesProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  useEffect(() => {
    if (!map) return

    const sourceId = 'trail-lines'
    const layerId = 'trail-lines-layer'
    const highlightLayerId = 'trail-lines-highlight'

    const features = trails.map((trail) => {
      let coords: [number, number][]
      try {
        const parsed: [number, number, number][] = JSON.parse(trail.trackData)
        coords = parsed.map(([lat, lng]) => [lng, lat])
      } catch {
        coords = []
      }

      const color = getDifficultyColor(trail.physicalDifficulty, trail.technicalDifficulty)

      return {
        type: 'Feature' as const,
        properties: { slug: trail.slug, name: trail.name, color, distanceMiles: trail.distanceMiles ?? null },
        geometry: { type: 'LineString' as const, coordinates: coords },
      }
    })

    const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }

    if (map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId)
    if (map.getLayer(layerId)) map.removeLayer(layerId)
    if (map.getSource(sourceId)) map.removeSource(sourceId)

    map.addSource(sourceId, { type: 'geojson', data: geojson })

    map.addLayer({
      id: layerId, type: 'line', source: sourceId,
      paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.8 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    map.addLayer({
      id: highlightLayerId, type: 'line', source: sourceId,
      paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 1 },
      filter: ['==', ['get', 'slug'], highlightSlug ?? ''],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    const onMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer'
      const feature = e.features?.[0]
      if (!feature?.properties) return
      const { name, distanceMiles } = feature.properties
      const distLabel = distanceMiles ? ` · ${Number(distanceMiles).toFixed(1)} mi` : ''
      popupRef.current?.remove()
      popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: '200px' })
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family: sans-serif; font-size: 12px; padding: 2px 0;"><strong>${name}</strong>${distLabel}</div>`)
        .addTo(map)
    }
    const onMouseMove = (e: mapboxgl.MapLayerMouseEvent) => { popupRef.current?.setLngLat(e.lngLat) }
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      popupRef.current?.remove()
      popupRef.current = null
    }

    map.on('mouseenter', layerId, onMouseEnter)
    map.on('mousemove', layerId, onMouseMove)
    map.on('mouseleave', layerId, onMouseLeave)

    if (onTrailClick) {
      map.on('click', layerId, (e) => {
        const feature = e.features?.[0]
        if (feature?.properties?.slug) onTrailClick(feature.properties.slug)
      })
    }

    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      try {
        map.off('mouseenter', layerId, onMouseEnter)
        map.off('mousemove', layerId, onMouseMove)
        map.off('mouseleave', layerId, onMouseLeave)
        if (map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId)
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch { /* map already removed */ }
    }
  }, [map, trails, highlightSlug, onTrailClick, colorMode])

  return null
}
