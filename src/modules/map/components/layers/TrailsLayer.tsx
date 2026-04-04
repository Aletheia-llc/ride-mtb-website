'use client'

import { useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import type { TrailSystemPin } from '../../types'

interface TrailsLayerProps {
  map: mapboxgl.Map
}

interface TrailLine {
  id: string
  slug: string
  name: string
  physicalDifficulty: number | null
  technicalDifficulty: number | null
  distance: number | null
  trackData: [number, number, number][]
  systemSlug: string
}

function difficultyColor(physical: number | null, technical: number | null): string {
  const d = Math.max(physical ?? 1, technical ?? 1)
  if (d <= 2) return '#22c55e'
  if (d === 3) return '#3b82f6'
  if (d === 4) return '#f59e0b'
  return '#ef4444'
}

export function TrailsLayer({ map }: TrailsLayerProps) {
  useEffect(() => {
    let isMounted = true
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    function ensureTrailLinesSource() {
      if (!map.getSource('trail-lines')) {
        map.addSource('trail-lines', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'trail-lines-layer',
          type: 'line',
          source: 'trail-lines',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 11, 2.5, 14, 2],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 11, 0.85],
          },
        })

        map.on('mouseenter', 'trail-lines-layer', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const { name, distance } = feature.properties
          const distLabel = distance ? ` · ${Number(distance).toFixed(1)} mi` : ''
          new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8, maxWidth: '180px' })
            .setHTML(`<div style="font-family:sans-serif;font-size:12px;padding:2px 0"><strong>${name}</strong>${distLabel}</div>`)
            .setLngLat(e.lngLat)
            .addTo(map)
        })

        map.on('mousemove', 'trail-lines-layer', (e) => {
          const popups = document.querySelectorAll('.mapboxgl-popup')
          popups.forEach((p) => p.remove())
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const { name, distance } = feature.properties
          const distLabel = distance ? ` · ${Number(distance).toFixed(1)} mi` : ''
          new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8, maxWidth: '180px' })
            .setHTML(`<div style="font-family:sans-serif;font-size:12px;padding:2px 0"><strong>${name}</strong>${distLabel}</div>`)
            .setLngLat(e.lngLat)
            .addTo(map)
        })

        map.on('mouseleave', 'trail-lines-layer', () => {
          map.getCanvas().style.cursor = ''
          const popups = document.querySelectorAll('.mapboxgl-popup')
          popups.forEach((p) => p.remove())
        })

        map.on('click', 'trail-lines-layer', (e) => {
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const { name, distance, physicalDifficulty, technicalDifficulty, systemSlug, slug, color } = feature.properties
          const distLabel = distance ? `${Number(distance).toFixed(1)} mi` : null
          const diffLevel = Math.max(physicalDifficulty ?? 1, technicalDifficulty ?? 1)
          const diffLabels: Record<number, string> = { 1: 'Beginner', 2: 'Easy', 3: 'Intermediate', 4: 'Hard', 5: 'Expert' }
          const diffLabel = diffLabels[diffLevel] ?? 'Unknown'
          new mapboxgl.Popup({ offset: 8, maxWidth: '220px' })
            .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
              <strong style="font-size:14px">${name}</strong>
              <div style="font-size:12px;color:#666;margin-top:2px">
                <span style="color:${color};font-weight:600">${diffLabel}</span>
                ${distLabel ? ` · ${distLabel}` : ''}
              </div>
              <a href="/trails/explore/${systemSlug}/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#16a34a">View Trail →</a>
            </div>`)
            .setLngLat(e.lngLat)
            .addTo(map)
        })
      }
    }

    function clearTrailLines() {
      const src = map.getSource('trail-lines') as mapboxgl.GeoJSONSource | undefined
      if (src) src.setData({ type: 'FeatureCollection', features: [] })
    }

    function fetchAndRenderLines() {
      if (!isMounted || !map || map._removed) return

      const zoom = map.getZoom()
      if (zoom < 9) {
        clearTrailLines()
        if (map.getLayer('trail-pins')) map.setLayoutProperty('trail-pins', 'visibility', 'visible')
        return
      }

      // Hide pins only when fully zoomed in; keep them visible at zoom 9-10 for context
      if (zoom >= 11 && map.getLayer('trail-pins')) {
        map.setLayoutProperty('trail-pins', 'visibility', 'none')
      } else if (map.getLayer('trail-pins')) {
        map.setLayoutProperty('trail-pins', 'visibility', 'visible')
      }

      const visibleSystems = map.querySourceFeatures('trails', {
        filter: ['!', ['has', 'point_count']],
      })
      const systemIds = [...new Set(visibleSystems.map((f) => f.properties?.id).filter(Boolean))].slice(0, 10) as string[]

      if (systemIds.length === 0) {
        clearTrailLines()
        return
      }

      ensureTrailLinesSource()

      fetch(`/api/trails/lines?systemIds=${systemIds.join(',')}`)
        .then((r) => r.json())
        .then((trails: TrailLine[]) => {
          if (!isMounted || !map || map._removed) return

          const features: GeoJSON.Feature[] = trails
            .filter((t) => Array.isArray(t.trackData) && t.trackData.length >= 2)
            .map((t) => ({
              type: 'Feature',
              properties: {
                id: t.id,
                slug: t.slug,
                name: t.name,
                physicalDifficulty: t.physicalDifficulty,
                technicalDifficulty: t.technicalDifficulty,
                distance: t.distance,
                systemSlug: t.systemSlug,
                color: difficultyColor(t.physicalDifficulty, t.technicalDifficulty),
              },
              geometry: {
                type: 'LineString',
                coordinates: t.trackData.map(([lat, lng]) => [lng, lat]),
              },
            }))

          const src = map.getSource('trail-lines') as mapboxgl.GeoJSONSource | undefined
          if (src) src.setData({ type: 'FeatureCollection', features })
        })
        .catch(console.error)
    }

    function scheduleFetch() {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(fetchAndRenderLines, 300)
    }

    fetch('/api/trails/map')
      .then((r) => r.json())
      .then((pins: TrailSystemPin[]) => {
        if (!isMounted || !map || map._removed) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: pins.map((p) => ({
            type: 'Feature',
            properties: { id: p.id, slug: p.slug, name: p.name, city: p.city, state: p.state, trailCount: p.trailCount, rating: p.averageRating },
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          })),
        }

        if (map.getSource('trails')) {
          (map.getSource('trails') as mapboxgl.GeoJSONSource).setData(geojson)
          return
        }

        map.addSource('trails', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 9, clusterRadius: 50 })
        map.addLayer({ id: 'trail-clusters', type: 'circle', source: 'trails', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#16a34a', 'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40], 'circle-opacity': 0.85 } })
        map.addLayer({ id: 'trail-cluster-count', type: 'symbol', source: 'trails', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 14 },
          paint: { 'text-color': '#ffffff' } })
        map.addLayer({ id: 'trail-pins', type: 'circle', source: 'trails', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#16a34a', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

        map.on('click', 'trail-pins', (e) => {
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const { slug, name, city, state, trailCount, rating } = feature.properties
          new mapboxgl.Popup({ offset: 15, maxWidth: '220px' })
            .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
              <strong style="font-size:14px">${name}</strong>
              <div style="font-size:12px;color:#666;margin-top:2px">${city}, ${state}</div>
              <div style="font-size:12px;margin-top:4px">${trailCount} trails${rating ? ` · ★ ${Number(rating).toFixed(1)}` : ''}</div>
              <a href="/trails/explore/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#16a34a">Explore Trails →</a>
            </div>`)
            .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
            .addTo(map)
        })

        map.on('mouseenter', 'trail-pins', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'trail-pins', () => { map.getCanvas().style.cursor = '' })
        map.on('click', 'trail-clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['trail-clusters'] })
          const clusterId = features[0]?.properties?.cluster_id
          if (clusterId != null) {
            (map.getSource('trails') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return
              map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom })
            })
          }
        })

        map.on('zoomend', scheduleFetch)
        map.on('moveend', scheduleFetch)

        fetchAndRenderLines()
      })
      .catch(console.error)

    return () => {
      isMounted = false
      if (debounceTimer) clearTimeout(debounceTimer)
      if (!map || map._removed) return

      map.off('zoomend', scheduleFetch)
      map.off('moveend', scheduleFetch)

      for (const layer of ['trail-lines-layer', 'trail-clusters', 'trail-cluster-count', 'trail-pins']) {
        if (map.getLayer(layer)) map.removeLayer(layer)
      }
      for (const source of ['trail-lines', 'trails']) {
        if (map.getSource(source)) map.removeSource(source)
      }
    }
  }, [map])

  return null
}
