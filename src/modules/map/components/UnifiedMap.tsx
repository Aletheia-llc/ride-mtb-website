'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapStyleSelector, MAPBOX_STYLES } from './MapStyleSelector'
import type { MapStyle } from './MapStyleSelector'
import { LayerToggle } from './LayerToggle'
import { useMapLayers } from '../hooks/useMapLayers'
import type { LayerName } from '../types'

import { TrailsLayer } from './layers/TrailsLayer'
import { EventsLayer } from './layers/EventsLayer'
import { CoachesLayer } from './layers/CoachesLayer'
import { SkateparksLayer } from './layers/SkateparksLayer'
import { PumpTracksLayer } from './layers/PumpTracksLayer'
import { BikeParksLayer } from './layers/BikeParksLayer'

interface UnifiedMapProps {
  defaultLayers: LayerName[]
  availableLayers: LayerName[]
  className?: string
  center?: [number, number]
  zoom?: number
}

export function UnifiedMap({
  defaultLayers,
  availableLayers,
  className = '',
  center = [-98.5, 39.8],
  zoom = 4,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard')
  const [mapLoaded, setMapLoaded] = useState(false)
  const { activeLayers, toggleLayer } = useMapLayers(defaultLayers, availableLayers)

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLES[mapStyle],
      center,
      zoom,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('load', () => {
      map.resize()
      setMapLoaded(true)
    })

    // Resize on next frame to handle CSS height resolving after mount
    requestAnimationFrame(() => { map.resize() })

    mapRef.current = map
    return () => { map.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStyleChange = useCallback((newStyle: MapStyle) => {
    setMapStyle(newStyle)
    const map = mapRef.current
    if (!map) return
    map.setStyle(MAPBOX_STYLES[newStyle])
    map.once('style.load', () => {
      setMapLoaded(false)
      setTimeout(() => setMapLoaded(true), 100)
      if (newStyle === '3d' || newStyle === '3d-satellite') {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          })
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
        map.easeTo({ pitch: 60 })
      } else {
        map.setTerrain(null)
        map.easeTo({ pitch: 0 })
      }
    })
  }, [])

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {availableLayers.length > 1 && (
        <LayerToggle
          availableLayers={availableLayers}
          activeLayers={activeLayers}
          onToggle={toggleLayer}
        />
      )}
      <MapStyleSelector current={mapStyle} onChange={handleStyleChange} />
      {/* Layer components mount here when map is ready */}
      {mapLoaded && mapRef.current && availableLayers.includes('trails') && activeLayers.has('trails') && (
        <TrailsLayer map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('events') && activeLayers.has('events') && (
        <EventsLayer map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('coaching') && activeLayers.has('coaching') && (
        <CoachesLayer map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('skateparks') && activeLayers.has('skateparks') && (
        <SkateparksLayer map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('pumptracks') && activeLayers.has('pumptracks') && (
        <PumpTracksLayer map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('bikeparks') && activeLayers.has('bikeparks') && (
        <BikeParksLayer map={mapRef.current} />
      )}
    </div>
  )
}
