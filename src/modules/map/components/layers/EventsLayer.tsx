'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { EventPin } from '../../types'

const EVENT_TYPE_COLORS: Record<string, string> = {
  race: '#ef4444', race_xc: '#ef4444', race_enduro: '#ef4444',
  race_dh: '#ef4444', race_marathon: '#ef4444', race_other: '#ef4444',
  group_ride: '#22c55e',
  clinic: '#3b82f6', camp: '#3b82f6', skills_clinic: '#3b82f6',
  trail_work: '#f59e0b',
  social: '#a855f7', expo: '#a855f7', demo_day: '#a855f7', bike_park_day: '#a855f7',
}
const DEFAULT_COLOR = '#6b7280'

function getColor(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? DEFAULT_COLOR
}

interface EventsLayerProps {
  map: mapboxgl.Map
}

export function EventsLayer({ map }: EventsLayerProps) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/events/map')
      .then((r) => r.json())
      .then((pins: EventPin[]) => {
        if (!map || map._removed) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: pins.map((p) => ({
            type: 'Feature',
            properties: { id: p.id, slug: p.slug, title: p.title, startDate: p.startDate, eventType: p.eventType, rsvpCount: p.rsvpCount, color: getColor(p.eventType) },
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          })),
        }

        if (!map.getSource('events')) {
          map.addSource('events', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 10, clusterRadius: 40 })
          map.addLayer({ id: 'event-clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'],
            paint: { 'circle-color': '#ef4444', 'circle-radius': ['step', ['get', 'point_count'], 18, 5, 26, 10, 36], 'circle-opacity': 0.85 } })
          map.addLayer({ id: 'event-cluster-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'],
            layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 13 },
            paint: { 'text-color': '#ffffff' } })
          map.addLayer({ id: 'event-pins', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': ['get', 'color'], 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

          map.on('click', 'event-pins', (e) => {
            const feature = e.features?.[0]
            if (!feature?.properties) return
            const { slug, title, startDate, eventType, rsvpCount, color } = feature.properties
            const dateStr = new Date(startDate).toLocaleDateString()
            new mapboxgl.Popup({ offset: 15, maxWidth: '240px' })
              .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
                <strong style="font-size:14px">${title}</strong>
                <div style="margin-top:4px"><span style="background:${color};color:#fff;border-radius:4px;padding:1px 6px;font-size:11px">${eventType.replace(/_/g, ' ')}</span></div>
                <div style="font-size:12px;color:#666;margin-top:4px">${dateStr} · ${rsvpCount} going</div>
                <a href="/events/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#ef4444">View Event →</a>
              </div>`)
              .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
              .addTo(map)
          })
          map.on('mouseenter', 'event-pins', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'event-pins', () => { map.getCanvas().style.cursor = '' })
        } else {
          (map.getSource('events') as mapboxgl.GeoJSONSource).setData(geojson)
        }
      })
      .catch(console.error)

    return () => {
      if (!map || map._removed) return
      for (const layer of ['event-clusters', 'event-cluster-count', 'event-pins']) {
        if (map.getLayer(layer)) map.removeLayer(layer)
      }
      if (map.getSource('events')) map.removeSource('events')
    }
  }, [map])

  return null
}
