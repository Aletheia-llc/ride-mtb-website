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

type MapMouseHandler = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => void
type VoidHandler = () => void

export function SystemClusterMap({
  systems, className = '', onSystemClick, onMapReady,
  center = [-98.5, 39.8], zoom = 4, onMoveEnd,
}: SystemClusterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard')
  const [loaded, setLoaded] = useState(false)

  // Callback refs — keeps closures fresh without re-registering map listeners
  const onMoveEndRef = useRef(onMoveEnd)
  useEffect(() => { onMoveEndRef.current = onMoveEnd }, [onMoveEnd])

  const onMapReadyRef = useRef(onMapReady)
  useEffect(() => { onMapReadyRef.current = onMapReady }, [onMapReady])

  // Handler refs — stored so we can call map.off() before re-registering
  const clusterClickHandlerRef = useRef<MapMouseHandler | null>(null)
  const pinClickHandlerRef = useRef<MapMouseHandler | null>(null)
  const clusterMouseEnterRef = useRef<VoidHandler | null>(null)
  const clusterMouseLeaveRef = useRef<VoidHandler | null>(null)
  const pinMouseEnterRef = useRef<VoidHandler | null>(null)
  const pinMouseLeaveRef = useRef<VoidHandler | null>(null)

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

    // Remove stale handlers before re-registering
    if (clusterClickHandlerRef.current) map.off('click', 'clusters', clusterClickHandlerRef.current)
    if (pinClickHandlerRef.current) map.off('click', 'system-pins', pinClickHandlerRef.current)
    if (clusterMouseEnterRef.current) map.off('mouseenter', 'clusters', clusterMouseEnterRef.current)
    if (clusterMouseLeaveRef.current) map.off('mouseleave', 'clusters', clusterMouseLeaveRef.current)
    if (pinMouseEnterRef.current) map.off('mouseenter', 'system-pins', pinMouseEnterRef.current)
    if (pinMouseLeaveRef.current) map.off('mouseleave', 'system-pins', pinMouseLeaveRef.current)

    clusterClickHandlerRef.current = (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const clusterId = features[0]?.properties?.cluster_id
      if (clusterId != null) {
        (map.getSource('systems') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return
          map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom })
        })
      }
    }
    map.on('click', 'clusters', clusterClickHandlerRef.current)

    pinClickHandlerRef.current = (e) => {
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
    }
    map.on('click', 'system-pins', pinClickHandlerRef.current)

    clusterMouseEnterRef.current = () => { map.getCanvas().style.cursor = 'pointer' }
    clusterMouseLeaveRef.current = () => { map.getCanvas().style.cursor = '' }
    pinMouseEnterRef.current = () => { map.getCanvas().style.cursor = 'pointer' }
    pinMouseLeaveRef.current = () => { map.getCanvas().style.cursor = '' }
    map.on('mouseenter', 'clusters', clusterMouseEnterRef.current)
    map.on('mouseleave', 'clusters', clusterMouseLeaveRef.current)
    map.on('mouseenter', 'system-pins', pinMouseEnterRef.current)
    map.on('mouseleave', 'system-pins', pinMouseLeaveRef.current)
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
      onMapReadyRef.current?.(map)
    })

    map.on('moveend', () => {
      const b = map.getBounds()
      if (!b) return
      onMoveEndRef.current?.(
        { ne: [b.getNorthEast().lng, b.getNorthEast().lat], sw: [b.getSouthWest().lng, b.getSouthWest().lat] },
        [map.getCenter().lng, map.getCenter().lat],
        map.getZoom()
      )
    })

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
      onMapReadyRef.current?.(map)
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
  }, [addData])

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      <MapStyleSelector current={mapStyle} onChange={handleStyleChange} />
    </div>
  )
}
