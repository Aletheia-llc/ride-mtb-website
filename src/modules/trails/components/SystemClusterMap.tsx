'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { MapStyleSelector } from './MapStyleSelector'
import type { MapStyle } from './MapStyleSelector'
import { MAPBOX_STYLES } from './MapStyleSelector'

interface SystemPin {
  slug: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
  trailCount: number
  averageRating?: number | null
}

interface SystemClusterMapProps {
  systems: SystemPin[]
  className?: string
  onSystemClick?: (slug: string) => void
  onMapReady?: (map: mapboxgl.Map) => void
  center?: [number, number]
  zoom?: number
  onMoveEnd?: (bounds: { ne: [number, number]; sw: [number, number] }, center: [number, number], zoom: number) => void
}

export function SystemClusterMap({
  systems, className = '', onSystemClick, onMapReady,
  center = [-98.5, 39.8], zoom = 4, onMoveEnd,
}: SystemClusterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard')
  const [loaded, setLoaded] = useState(false)

  const addData = useCallback((map: mapboxgl.Map) => {
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: systems.map((s) => ({
        type: 'Feature',
        properties: { slug: s.slug, name: s.name, city: s.city, state: s.state, trailCount: s.trailCount, rating: s.averageRating ? Number(s.averageRating) : null },
        geometry: { type: 'Point', coordinates: [Number(s.longitude), Number(s.latitude)] },
      })),
    }

    if (map.getSource('systems')) {
      (map.getSource('systems') as mapboxgl.GeoJSONSource).setData(geojson)
      return
    }

    map.addSource('systems', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 12, clusterRadius: 50 })

    map.addLayer({ id: 'clusters', type: 'circle', source: 'systems', filter: ['has', 'point_count'],
      paint: { 'circle-color': '#16a34a', 'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40], 'circle-opacity': 0.85 } })

    map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'systems', filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 14 },
      paint: { 'text-color': '#ffffff' } })

    map.addLayer({ id: 'system-pins', type: 'circle', source: 'systems', filter: ['!', ['has', 'point_count']],
      paint: { 'circle-color': '#16a34a', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const clusterId = features[0]?.properties?.cluster_id
      if (clusterId != null) {
        (map.getSource('systems') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return
          map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom })
        })
      }
    })

    map.on('click', 'system-pins', (e) => {
      const feature = e.features?.[0]
      if (!feature?.properties) return
      const { slug, name, city, state, trailCount, rating } = feature.properties

      const popup = new mapboxgl.Popup({ offset: 15, maxWidth: '220px' }).setHTML(
        `<div style="font-family: sans-serif; padding: 4px 0;">
          <strong style="font-size: 14px;">${name}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 2px;">${city}, ${state}</div>
          <div style="font-size: 12px; margin-top: 4px;">${trailCount} trails${rating ? ` · ★ ${Number(rating).toFixed(1)}` : ''}</div>
        </div>`
      )
      popup.setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number]).addTo(map)

      if (onSystemClick) {
        const el = popup.getElement()
        if (el) { el.style.cursor = 'pointer'; el.addEventListener('click', () => onSystemClick(slug)) }
      }
    })

    map.on('mouseenter', 'system-pins', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'system-pins', () => { map.getCanvas().style.cursor = '' })
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
  }, [systems, onSystemClick])

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLES[mapStyle],
      center, zoom, antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      addData(map)
      setLoaded(true)
      onMapReady?.(map)
    })

    if (onMoveEnd) {
      map.on('moveend', () => {
        const b = map.getBounds()
        if (!b) return
        onMoveEnd(
          { ne: [b.getNorthEast().lng, b.getNorthEast().lat], sw: [b.getSouthWest().lng, b.getSouthWest().lat] },
          [map.getCenter().lng, map.getCenter().lat],
          map.getZoom()
        )
      })
    }

    mapRef.current = map
    return () => { map.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    addData(map)
  }, [systems, loaded, addData])

  const handleStyleChange = useCallback((newStyle: MapStyle) => {
    setMapStyle(newStyle)
    const map = mapRef.current
    if (!map) return
    map.setStyle(MAPBOX_STYLES[newStyle])
    map.once('style.load', () => {
      addData(map)
      onMapReady?.(map)
      if (newStyle === '3d' || newStyle === '3d-satellite') {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 })
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
        map.easeTo({ pitch: 60 })
      } else {
        map.setTerrain(null)
        map.easeTo({ pitch: 0 })
      }
    })
  }, [addData, onMapReady])

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      <MapStyleSelector current={mapStyle} onChange={handleStyleChange} />
    </div>
  )
}
